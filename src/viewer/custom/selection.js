const { SelectionBox } = require('./overlays')

class Selection {

  constructor() {
    this.startedSelection = false
    this.overlay = new SelectionBox()
    this.activeFace = null
    this.selectedVerticies = []
    this.opStack = []
    this.startedDragging = false
    this.vertsBeforeDragging = null
    this.draggingHistory = []
  }

  getSelectionMesh() {
    return this.overlay.selectionMesh
  }

  getExpansionMeshes() {
    return this.overlay.expandMeshes
  }

  handleRaycast(intersects) {
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
  }

  handlePointerDown() {
    // console.warn('Pointr down')
    if (this.overlay.activeFace && !this.startedDragging) {
      this.startedDragging = true
      this.vertsBeforeDragging = cloneVector3a(this.overlay.getSelectionVerts())
      // console.warn('Start draggig', this.vertsBeforeDragging)
    }
  }

  handlePointerUp() {
    if (this.startedDragging) {
      // console.warn('End draggig')
      this.startedDragging = false
      this.vertsBeforeDragging = null
    }
  }

  handleCursorMove(event, raypos) {
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

  updateCursor(position) {
    if (this.selectedVerticies.length == 1) {
      clearTimeout(this.selectionTimer)
      this.selectionTimer = setTimeout(() => {
        this.overlay.fromPoints(this.selectedVerticies[0], position)
      }, 50);
    } else if (this.selectedVerticies.length == 2) {
      // nothing
    }
  }

  // The user has started a selection with one or more points
  addPoint(vec3) {
    if (this.selectedVerticies.length == 2) {
      this.selectedVerticies = []
    }
    console.log('Add poin', vec3)
    this.selectedVerticies.push(vec3)
    // this.opStack
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
  stage() { }

  // The staged selection is pulled from the world
  pull() { }

  // The staged selection is written to the world
  commit() { }

  // Start copying the selection, make a clone of the existing one
  // by calling pull(), then this new selection can be transformed
  copy() { }

  // Cutting the selection clones the selection using pull() then
  // gets ready clears the area inside the selection
  cut() { }

  // Actually executes the copy/cut operation
  paste() { }
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