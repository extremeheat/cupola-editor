const { addBlockHighlight } = require('./overlays')
const { Selection } = require('./selection')
const Viewer3D = require('./viewer')

class Editor3D extends Viewer3D {
  constructor(viewer) {
    super(viewer)
    this.viewer = viewer

    this.hLastPos = new THREE.Vector3()
    this.highlightMesh = null
    this.selection = null
    this.lastPos3D = null
  }

  startSelection() {
    console.log('[edit] started selection')
    this.selection = new Selection()
  }

  onStarted() {
    super.onStarted()
    this.highlightMesh = addBlockHighlight()
  }

  onPointerMove(event) {
    super.onPointerMove(event)

    this.onUpdate()
  }

  onCursorControlClick(vec3) {
    console.log('Got ctrl click', this.lastPos3D)
    if (!this.selection) {
      this.startSelection()
    }

    this.selection.addPoint(this.lastPos3D)
  }

  blockHighlight(x, y, z) {
    // console.info('hili', x, y, z)
    this.highlightMesh.position.set(x, y, z)
  }

  onUpdate() {
    this.raycaster.setFromCamera(this.mousePos, global.camera);

    if (this.mousePos.equals(this.lastCursorPos)) {
      return;
    }
    this.lastCursorPos = this.mousePos.clone()

    let children = Object.values(global.world.sectionMeshs)

    if (this.selection) {
      let mesh = this.selection.getSelectionMesh()
      if (mesh) {
        children.push(mesh)
      }
    }

    // calculate objects intersecting the picking ray
    const intersects = this.raycaster.intersectObjects(children)

    // if we are currently in a selection, run logic in
    // selection.js
    this.selection?.handleRaycast(intersects)

    // console.log('Intersects', intersects);
    for (let i = 0; i < intersects.length; i++) {
      let intersect = intersects[i]
      if (intersect.object.name == 'selection') continue;
      let e = intersects[i];
      let f = e.point.clone().floor()
      let n = e.face.normal

      this.blockHighlight(
        n.x <= 0 ? f.x : f.x - 1,
        n.y <= 0 ? f.y : f.y - 1,
        n.z <= 0 ? f.z : f.z - 1
      )
      // console.log('Intersects', e, global.myMesh.position, e.point);
      this.lastPos3D = this.highlightMesh.position.clone()

      this.selection?.updateCursor(this.lastPos3D)
      break;
      // set(e.point.x,e.point.y,e.point.z)
      // intersects[ i ].object.material.color.set( 0xff0000 );
    }
  }

  onRender() {
    super.onRender()
    // this.onUpdate()
    // console.info('r')
  }

  onClick = (event) => {
    console.log('on click', global.controls.keyDowns)
    if (global.controls.keyDowns.includes("ControlLeft")) {
      this.onCursorControlClick(event);
    }
  }

  onPointerDown = (e) => {
    this.selection?.handlePointerDown()
  }

  onPointerUp = (e) => {
    this.selection?.handlePointerUp()
  }

  registerHandlers() {
    window.addEventListener('click', this.onClick, false)
    window.addEventListener('pointerdown', this.onPointerDown, false);
    window.addEventListener('pointerup', this.onPointerUp, false);

    super.registerHandlers()
  }

  unregisterHandlers() {
    window.removeEventListener('click', this.onClick)
    window.removeEventListener('pointerdown', this.onPointerDown)
    window.removeEventListener('pointerup', this.onPointerUp)
    super.unregisterHandlers()
  }
}

module.exports = Editor3D