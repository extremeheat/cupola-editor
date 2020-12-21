/* global THREE */
const { createBlockHighlightMesh } = require('./overlays')
const { Selection } = require('./selection')
const Viewer3D = require('./viewer')

class Editor3D extends Viewer3D {
  constructor(provider) {
    super(provider)

    // Raycasted coordinate user is looking at
    this.lastFarLookingPos = new THREE.Vector3()
    this.lastNearLookingPos = new THREE.Vector3()
    
    this.highlightMesh = null
    this.selection = null
    this.lastPos3D = null
  }

  startSelection() {
    console.log('[edit] started selection')
    this.selection = new Selection(this, this.provider)
  }

  endSelection() {
    this.selection.reset()
    this.selection = null
  }

  onStarted() {
    super.onStarted()
    this.startSelection()
    this.highlightMesh = createBlockHighlightMesh()
    this.highlightMesh2 = createBlockHighlightMesh()
    global.controls.enablePan = false
  }

  blockHighlight(x, y, z) {
    this.highlightMesh.position.set(x, y, z)
  }

  showHighlight() {
    global.scene.add(this.highlightMesh)
  }

  hideHighlight() {
    global.scene.remove(this.highlightMesh)
  }

  // for debugging
  blockHighlight2(x, y, z) {
    this.highlightMesh2.position.set(x, y, z)
  }

  onControlUpdate(event) {
    this.raycaster.setFromCamera(this.mousePos, global.camera)

    if (this.mousePos.equals(this.lastCursorPos)) {
      return
    }
    this.lastCursorPos = this.mousePos.clone()

    this.raycaster.ray.at(40, this.lastFarLookingPos)
    this.raycaster.ray.at(6, this.lastNearLookingPos)

    let children = Object.values(global.world.sectionMeshs)

    if (global.debugRaycasts) {
      let near = this.lastNearLookingPos.clone().floor()
      this.blockHighlight2(near.x, near.y, near.z)
      console.log('-> Looking' , this.lastNearLookingPos, this.lastFarLookingPos)
      let pos = this.lastFarLookingPos.clone().floor()
      let [cx,cz] = [pos.x >> 4, pos.z >> 4]
      console.debug('Looking at', [pos.x, pos.y, pos.z], [cx, cz])
    }

    if (this.selection) {
      let mesh = this.selection.getSelectionMeshes()
      if (mesh.length) {
        children.push(...mesh)
      }

      // var dist = this.box.position.clone().sub(camera.position).length();
      // this.raycaster.ray.at(4, this.box.position);

      let handled = this.selection.handleCursorMove(event, this.lastFarLookingPos)
      if (handled) {
        event.stopPropagation()
        return
      }
    }

    // calculate objects intersecting the picking ray
    const intersects = this.raycaster.intersectObjects(children)

    // if we are currently in a selection, run logic in
    // selection.js
    if (this.selection?.handleRaycast(intersects)) {
      event.stopPropagation()
      return
    }

    // console.log('Intersects', intersects);
    for (let i = 0; i < intersects.length; i++) {
      let intersect = intersects[i]
      if (intersect.object.name == 'selection') continue
      let e = intersects[i]
      let f = e.point.clone().floor()
      let n = e.face.normal

      this.blockHighlight(
        n.x <= 0 ? f.x : f.x - 1,
        n.y <= 0 ? f.y : f.y - 1,
        n.z <= 0 ? f.z : f.z - 1
      )
      this.lastPos3D = this.highlightMesh.position.clone()

      this.selection?.updateCursor(this.lastPos3D)
      break
    }
  }

  isChunkInUse(cx, cz) {
    if (!this.selection) return []
    return this.selection.getOccupiedChunks().includes(cx + ',' + cz)
  }

  addColumn(cx, cz, col) {
    this.selection?.loadSelectionsIn(cx, cz)
    super.addColumn(cx, cz, col)
  }

  unloadChunk(cx, cz) {
    this.selection?.unloadSelectionsIn(cx, cz)
    super.unloadChunk(cx, cz)
  }

  onRender() {
    super.onRender()
  }

  // DOM EVENTS

  onPointerMove(event) {
    super.onPointerMove(event)

    this.onControlUpdate(event)
  }

  onCursorControlClick() {
    console.log('Got ctrl click', this.lastPos3D)
    if (!this.selection) {
      this.startSelection()
    }

    this.selection.addPoint(this.lastPos3D)
  }

  onPointerDown = (e) => {
    // console.log('pointer down', e)
    //TODO: move this logic to selection.js
    if (e.ctrlKey && e.button == 0) {
      this.onCursorControlClick()
    } else {
      this.selection?.handlePointerDown(e)
    }

    this.hideHighlight()
  }

  onPointerUp = (e) => {
    // console.log('pointer up', e)
    this.selection?.handlePointerUp(e)
    this.showHighlight()
  }

  onKeyDown = (e) => {
    // console.log('keydown', e)
    this.selection?.handleKey(e.code)
  }

  onKeyUp = (e) => {
    this.selection?.handleKeyUp(e.code)
  }

  registerHandlers() {
    window.addEventListener('pointerdown', this.onPointerDown, false)
    window.addEventListener('pointerup', this.onPointerUp, false)
    window.addEventListener('keydown', this.onKeyDown, false)
    window.addEventListener('keyup', this.onKeyUp, false)

    super.registerHandlers()
  }

  unregisterHandlers() {
    window.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointerup', this.onPointerUp)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    super.unregisterHandlers()
  }
}

module.exports = Editor3D