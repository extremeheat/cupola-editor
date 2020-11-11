const { SelectionBox } = require('./overlays')

class Selection {

  constructor() {
    this.startedSelection = false
    this.overlay = new SelectionBox()
    this.activeFace = null
    this.selectedVerticies = []
    this.opStack = []
    this.startedDragging = true
  }

  getSelectionMesh() {
    return this.overlay.selectionMesh
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

    if (!isMakingSelection) this.activeFace = null
  }

  handlePointerDown() {
    if (this.activeFace) {
      this.startedDragging = true
    }
  }

  handlePointerUp() {
    if (this.startedDragging) {
      this.startedDragging = false
    }
  }

  updateCursor(position) {
    if (this.selectedVerticies.length == 1) {
      clearTimeout(this.selectionTimer)
      this.selectionTimer = setTimeout(() => {
        this.overlay.fromPoints(this.selectedVerticies[0], position)
      }, 50);
    } else if (this.selectedVerticies.length == 2) {

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
  resize() { }

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
  copy() {}

  // Cutting the selection clones the selection using pull() then
  // gets ready clears the area inside the selection
  cut() {}

  // Actually executes the copy/cut operation
  paste() {}
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

module.exports = { Selection }