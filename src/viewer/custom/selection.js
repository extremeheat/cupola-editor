const { SelectionBox } = require('./overlays')
const { BlockContainer } = require('../pviewer/blockcontainer')

class Selection {

  constructor(editor, provider) {
    this.editor = editor
    this.provider = provider
    this.startedSelection = false
    // when making our initial selection:
    this.overlay = new SelectionBox('selection')
    // when copy/cut our selection to dest:
    this.superlays = []
    this.superlayId = 'selection-box'
    this.activeSuperlay = -1
    // if we cannot drag a selection right now (control held)
    this.dragDisabled = false
    this.selectedVerticies = []
    this.opStack = []
    this.startedDragging = false
    this.vertsBeforeDragging = null
    this.draggingHistory = []
    this.container = null
    this.lastMesh = null

    this.hiddenLayers = []

    // TODO: convert this to typescript enum
    // enum State { Busy, Selecting, Selected, Dragging, Precut, Precopy }
    this.stateStack = []
    this.state = 'selecting'
    this.stateData = {
      copying: false,
      cutting: false,
      stage: null,
      premod: false,
      busy: false,
    }
  }

  reset() {
    this.state = 'selecting'
    this.stateData = {
      copying: false,
      cutting: false,
      stage: null,
      premod: false,
      busy: false,
    }
    this.startedSelection = false
    this.setActiveSuperlay(-1)
    // if we cannot drag a selection right now (control held)
    this.dragDisabled = false
    this.startedDragging = false
    this.vertsBeforeDragging = null
    this.draggingHistory = []
    this.selectedVerticies = []
    this.container = null
    this.lastMesh = null

    this.overlay.clear()
    this.overlay = new SelectionBox('selection')
    this.superlays.forEach(e => e.clear())
    this.superlays = []
    this.hiddenLayers = []
    setSuggestedActions([{ title: 'Create selection [Ctrl-Click]' }])
  }

  setState(state, modes) {
    this.stateStack.push({ ...this.stateData })
    this.state = state
    if (modes) {
      this.stateData = modes
    }
    // for (var key in modes) {
    //   this.stateData[key] = modes[key]
    // }
  }

  setActiveSuperlay(id) {
    if (id == -1) {
      if (this.activeSuperlay != -1) {
        let superlay = this.superlays[this.activeSuperlay]
        superlay.hasAttachedTransformControls = false
        global.transformControls.detach(superlay.selectionMesh)
      }
      global.scene.remove(global.transformControls)
    } else {
      let superlay = this.superlays[id]
      global.transformControls.attach(superlay.group)
      superlay.hasAttachedTransformControls = true
      global.scene.add(global.transformControls)
    }
    this.activeSuperlay = id
  }

  setDragDisabled(disabled) {
    this.dragDisabled = disabled
    if (disabled) {
      global.controls.enableRotate = false
      global.controls.enablePan = false
    } else {
      global.controls.enableRotate = true
      global.controls.enablePan = true
    }
  }

  isCopyOrCutting() {
    return this.stateData.copying || this.stateData.cutting
  }

  backward() {
    // let last = this.opStack.pop()
    // switch (last) {
    //   case 'AddPoint':

    // }
  }

  getSelectionMeshes() {
    let out = []
    if (this.overlay.selectionMesh) out.push(this.overlay.selectionMesh)
    for (var superlay of this.superlays) out.push(superlay.selectionMesh)
    return out
  }

  getExpansionMeshes() {
    return this.overlay.expandMeshes
  }

  getOccupiedChunks() {
    let ckeys = this.overlay.getChunksKeysInBB()

    this.superlays.forEach(e => {
      let keys = e.getChunksKeysInBB()
      for (let key of keys) {
        if (!ckeys.includes(ke)) ckeys.push(key)
      }
    })
    return ckeys
  }

  hideSelection(layer) {
    this.hiddenLayers.filter(e => e != layer.objectId)
    this.hiddenLayers.push(layer)
    if (layer.hasAttachedTransformControls) global.scene.remove(global.transformControls)
    layer.hide()
  }

  unhideSelection(layer) {
    this.hiddenLayers.filter(e => e != layer.objectId)
    if (layer.hasAttachedTransformControls) global.scene.add(global.transformControls)
    layer.show()
  }

  loadSelectionsIn(cx, cz) {
    let key = cx + ',' + cz
    for (var hidden of this.hiddenLayers) {
      let chunks = hidden.getChunksKeysInBB()
      if (chunks.includes(key)) {
        this.unhideSelection(hidden)
      }
    }
  }

  // Remove from the scene any selections which intersect pos
  unloadSelectionsIn(cx, cz) {
    let key = cx + ',' + cz
    
    let ckeys = this.overlay.getChunksKeysInBB()
    if (ckeys.includes(key)) {
      this.hideSelection(this.overlay)
    }

    this.superlays.forEach(e => {
      let keys = e.getChunksKeysInBB()
      if (keys.includes(key)) {
        this.hideSelection(e)
      }
    })
  }

  // called when the mouse cursor moves, and a raycast
  // has been done to locate looking at position
  // returns true if handled, cancel event propagation
  handleRaycast(intersects) {
    // if we are doing initial selecting
    if (this.state == 'selecting') {
      // run logic to check if the user is looking at 
      // a selection, and if the user doesn't have the 
      // left mouse cursor down to drag, then mark the face
      // "active" so it can be expanded on cursor move
      let isMakingSelection = false

      for (var intersect of intersects) {
        if (intersect.object.name == 'selection' && !this.startedDragging) {
          let n = intersect.face.normal
          let updatedColors = this.overlay.setActiveFace(n)

          if (updatedColors) {
            isMakingSelection = true
            break;
          }
        }
      }

      if (!isMakingSelection && !this.startedDragging) {
        // console.warn('Erased activeFace')
        this.overlay.emptyActiveFace()
      }
    } else if (this.isCopyOrCutting()) {
      if (this.startedDragging) {
        // console.log('Intersections ', intersects)
        for (var intersect of intersects) {
          let id = intersect.object.name
          if (id == this.superlayId || id == this.overlay.id) {
            continue
          }

          let vec3 = intersect.point
          this.superlays[this.activeSuperlay]?.move(Math.floor(vec3.x), Math.floor(vec3.y), Math.floor(vec3.z))
          break
        }
        return true
      } else {
        let hit = false
        for (var intersect of intersects) {
          // console.log(intersect.object)
          if (intersect.object.name == this.superlayId) {
            // console.log('HIT!!', intersect.object)
            // let n = intersect.face.normal
            this.setActiveSuperlay(intersect.object.data)
            hit = true
          }
        }
        // console.log('Marking?')
        if (!hit) this.activeSuperlay = -1
        // else console.log('marked active face!')
      }
    }
  }

  handlePointerDown() {
    // console.warn('Pointr down')
    // TODO: instead of this.selectedVerticies.length == 2, add utility function to check if
    // a complete selection has been made
    if (this.state == 'selecting' && this.selectedVerticies.length == 2) {
      if (this.overlay.activeFace && !this.startedDragging) {
        this.startedDragging = true
        this.vertsBeforeDragging = cloneVector3a(this.overlay.getSelectionVerts())
        // console.warn('Start draggig', this.vertsBeforeDragging)
      }
    } else if (this.isCopyOrCutting()) {
      if (this.activeSuperlay != -1 && !this.dragDisabled) {
        this.startedDragging = true
      }
      // for (var superlay of this.superlays) {
      //   if (superlay.activeFace) {
      //     this.startedDragging = true
      //   }
      // }
    }
  }

  handlePointerUp() {
    if (this.startedDragging) {
      console.warn('End draggig')
      this.startedDragging = false
      this.vertsBeforeDragging = null
    }
  }

  // called when the mouse cursor moves, but uses a ray
  // instead of a raycast
  handleCursorMove(event, raypos) {
    if (this.state == 'selecting') {
      if (this.startedDragging) {
        let last = this.draggingHistory[this.draggingHistory.length - 1]
        let first = this.draggingHistory[0]
        if (last) {
          let dx = last.x - first.x
          let dy = last.y - first.y
          let dz = last.z - first.z
          // deltas are relative to first drag event, so we need to
          // restore the box size to how it was on first drag event
          this.restoreSize()
          this.resize(dx, dy, dz)
        }
        this.draggingHistory.push(raypos.clone())
        // console.log('[sel] drag histor ',this.draggingHistory)
        return true
      } else {
        this.draggingHistory = []
      }
    }
  }

  handleKey(code) {

    if (code == 'Enter') {
      if (this.state == 'selecting') {
        this.stage()
      } else if (this.state == 'operation' && this.stateData.stage == 'post') {
        this.commit()
      }
    }

    // TODO: Fix race condition when copy/pasting
    if (this.state == 'selected') {
      if (code == 'KeyC' && global.controls.keyDowns.includes('ControlLeft')) {
        console.log('ctrl+c!!')
        this.copy()
      } else if (code == 'KeyX' && global.controls.keyDowns.includes('ControlLeft')) {
        console.log('ctrl+x!!')
        this.cut()
      }
    }

    if (this.isCopyOrCutting()) {
      if (code == 'KeyV' && global.controls.keyDowns.includes('ControlLeft')) {
        console.log('ctrl+v!!')
        this.paste()
      }

      if (code == 'ControlLeft') {
        this.setDragDisabled(true)
        global.transformControls.enabled = true
      }
    }
  }

  handleKeyUp(code) {
    if (code == 'ControlLeft') {
      global.transformControls.enabled = false
      this.setDragDisabled(false)
    }
  }

  updateCursor(position) {
    if (this.state == 'selecting') {
      if (this.selectedVerticies.length == 1) {
        clearTimeout(this.selectionTimer)
        this.selectionTimer = setTimeout(() => {
          this.overlay.fromPoints(this.selectedVerticies[0], position)
        }, 50);
      } else if (this.selectedVerticies.length == 2) {
        setSuggestedActions([{ title: 'Drag face to expand' }, { title: 'Confirm selection (Enter)' }])
      }
    }
  }

  // The user has started a selection with one or more points
  addPoint(vec3) {
    if (!vec3) return
    if (this.state == 'selecting') {
      if (this.selectedVerticies.length == 2) {
        this.selectedVerticies = []
      }
      console.log('Add poin', vec3)
      this.selectedVerticies.push(vec3)
    }
    // this.opStack.push([ 'AddPoint' ])
  }

  // The user would like to resize a selection (box) or add
  // points to the selection (freeform)
  resize(dx, dy, dz, temporary = true) {
    let af = this.overlay.getActiveFace()
    console.log('[selection] resize', af, dx, dy, dz)
    if (af.x != 0) this.overlay.expandActiveFace(dx)
    if (af.y != 0) this.overlay.expandActiveFace(dy)
    if (af.z != 0) this.overlay.expandActiveFace(dz)

    if (!temporary) {
      this.vertsBeforeDragging = cloneVector3a(this.overlay.getSelectionVerts())
    }
  }

  // Revert our changes to size - called before every step of resize()
  // and when user selects escape to undo a drag op
  restoreSize() {
    this.overlay.setSelectionVerts(cloneVector3a(this.vertsBeforeDragging))
    // console.log('[selection] restore', this.overlay.getSelectionVerts(), this.vertsBeforeDragging)
  }

  // The user 'finializes' the selection and it is now 'staged'
  // Box changes from red to green so the user knows they
  // can no longer resize or add points to this selection
  stage() {
    if (this.state == 'selecting' && (this.selectedVerticies.length == 2)) {
      this.state = 'selected'
      this.overlay.markConfirmed()

      setSuggestedActions([{ title: 'Copy [Ctrl-C]' }, { title: 'Cut [Ctrl-X]' }])
    }
  }

  // The staged selection is pulled from the world
  async pull() {
    // console.assert(['selected', 'precopy', 'precut'].includes(this.state), 'selection not yet committed')
    // viewer.selection.overlay.selectionMesh.geometry.boundingBox
    let bb = this.overlay.getBoundingBox()
    if (!bb) {
      throw 'No active bounding box!'
    }
    let minX = Math.round(bb.min.x); let maxX = Math.round(bb.max.x);
    let minY = Math.round(bb.min.y); let maxY = Math.round(bb.max.y);
    let minZ = Math.round(bb.min.z); let maxZ = Math.round(bb.max.z);
    let w = maxX - minX; let l = maxZ - minZ; let h = maxY - minY;
    let container = new BlockContainer(this.provider.version, h, w, l, minX, minY, minZ)
    for (var x = minX; x < maxX; x++) {
      for (var z = minZ; z < maxZ; z++) {
        for (var y = minY; y < maxY; y++) {
          let block = await this.provider.world.getBlock({ x, y, z })
          // console.log('pull', x, y, z, block)
          container.setBlock(x, y, z, block)
        }
      }
    }
    // container.setOffset(0,0,0)
    // console.log('[selection] container', container)
    global.lastContainer = container
    return container
  }

  async generateMesh(container) {
    return new Promise(res =>
      global.world.requestMesh(container, (mesh) => {
        console.log('[selection] pulled mesh ', mesh)
        mesh.scale.setScalar(1.001) // slightly scale bigger to avoid tearing from overlapping mesh
        mesh.geometry.center() // remove geometry offset
        global.pulledMesh = mesh
        res(mesh)
        // global.ourMesh = mesh
        // global.scene.add(mesh)
      })
    )
  }

  // The staged selection is written to the world
  commit() {
    if (!this.isCopyOrCutting()) {
      console.warn("[selection] can't commit because not copy/cutting")
      return
    }

    if (this.stateData.stage != 'post') {
      console.warn("[selection] can't commit until paste")
    }
    console.assert(this.container, 'missing container!')
    console.log('[select] commiting!')

    const c = this.container

    if (this.stateData.cutting) {
      for (var x = c.minX; x < c.minX + c.w; x++) {
        for (var y = c.minY; y < c.minY + c.h; y++) {
          for (var z = c.minZ; z < c.minZ + c.l; z++) {
            this.provider.setBlockStateId(x, y, z, 0)
            // console.log('setBlock0', x, y, z, 0)
          }
        }
      }
    }

    for (var superlay of this.superlays) {
      // let min = superlay.point1
      // let max = superlay.point2
      let [min, max] = superlay.getRoundedBoundingBox()

      for (var x = min.x, X = c.minX; x <= max.x; x++, X++) {
        for (var y = min.y, Y = c.minY; y <= max.y; y++, Y++) {
          for (var z = min.z, Z = c.minZ; z <= max.z; z++, Z++) {
            this.provider.setBlock(x, y, z, c.getBlock({ x: X, y: Y, z: Z }))
            // console.log('setBlock1', x, y, z, X, Y, Z, c.getBlock({ x: X, y: Y, z: Z }))
          }
        }
      }
    }

    this.reset()
  }

  // Start copying the selection, make a clone of the existing one
  // by calling pull(), then this new selection can be transformed
  async copy() {
    this.setState('busy')
    this.overlay.color = 0x00FFFF
    this.overlay.recolorFaces()
    this.overlay.recolor(0x00FFFF)
    setSuggestedActions([{ title: 'Paste [Ctrl-V]' }])

    this.container = await this.pull()
    let mesh = await this.generateMesh(this.container)
    this.lastMesh = mesh
    this.setState('operation', { copying: true, stage: 'pre' })
  }

  // Cutting the selection clones the selection using pull() then
  // gets ready clears the area inside the selection
  async cut() {
    this.state = 'busy'
    this.overlay.color = 0xFFFFFF
    this.overlay.recolorFaces()
    setSuggestedActions([{ title: 'Paste [Ctrl-V]' }])

    this.container = await this.pull()
    let mesh = await this.generateMesh(this.container)
    this.lastMesh = mesh
    this.setState('operation', { cutting: true, stage: 'pre' })
  }

  // Actually executes the copy/cut operation
  paste() {
    if (!this.isCopyOrCutting()) {
      console.warn('not cutting/copying -> currently ', this.state)
    }

    this.stateData.stage = 'post'

    let box = new SelectionBox(this.superlayId)
    box.color = 0x1010FF
    box.addSibling(this.lastMesh.clone())

    // this.state = 'dragging'
    let [p1, p2] = this.overlay.getRoundedBoundingBox()
    box.fromPoints(p1, p2, true, this.superlays.length)
    // copy bounding offset to selected terrain mesh
    box.showSiblings(true)

    this.superlays.push(box)

    setSuggestedActions([{ title: 'Paste [Ctrl-V]' }, { title: 'Translate [Ctrl]' }, { title: 'Save changes (Enter)' }])
  }
}

class BlockSelection extends Selection {
  constructor() {
    super()
  }
}

class FreeformBoxSelection extends Selection {
  constructor() {
    super()
  }
}

class ChunkSelection extends Selection {

}

function cloneVector3a(array) {
  let next = []
  for (var e of array) {
    next.push(e.clone())
  }
  return next
}

module.exports = { Selection }