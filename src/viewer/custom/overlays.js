class SelectionBox {
  constructor(id) {
    this.id = id
    this.objectId = Date.now()
    this.group = new THREE.Group()
    this.selectionMesh = null
    // Outline
    this.wireframeMesh = null

    this.activeFace = null

    // Used for expanding selection box
    this.siblingMeshes = []

    this.unconfirmedColor = 0x880000
    this.confirmedColor = 0x008800

    this.color = this.unconfirmedColor

    this.hasAttachedTransformControls = false

    this.show()
  }

  clear() {
    if (this.selectionMesh)
      this.group.remove(this.selectionMesh)
    if (this.wireframeMesh)
      this.group.remove(this.wireframeMesh)

    for (var _mesh of this.siblingMeshes) {
      this.group.remove(_mesh)
    }
  }

  hide() {
    global.meshes.remove(this.group)
  }

  show() {
    global.meshes.add(this.group)
  }

  addSelectionBox(pos1, pos2, noTrans) {
    this.clear()
    console.log('Create box from ', pos1, pos2)

    let height = Math.abs(Math.min(pos1.y, pos2.y) - Math.max(pos1.y, pos2.y)) + 1
    let width = Math.abs(Math.min(pos1.x, pos2.x) - Math.max(pos1.x, pos2.x)) + 1
    let length = Math.abs(Math.min(pos1.z, pos2.z) - Math.max(pos1.z, pos2.z)) + 1
    console.log('[box] HWL', height, width, length, pos1, pos2)

    let geometry = new THREE.BoxGeometry(width + 0.01, height + 0.01, length + 0.01)
    if (noTrans) {
      geometry.translate(width % 2 == 0 ? 0 : 0.5,
        height % 2 == 0 ? 0 : 0.5, length % 2 == 0 ? 0 : 0.5)
      // console.log('HWL Translated', width % 2 == 0 ? 0 : 0.5, height % 2 == 0 ? 0 : 0.5,
      //   length % 2 == 0 ? 0 : 0.5)
    } else {
      geometry.translate(0.5, 0.5, 0.5)
    }

    geometry.computeBoundingSphere()

    // TODO: Better block texture for selection box so easier
    // to see block boundaries. 
    let material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.4,
      color: this.color,
      vertexColors: THREE.FaceColors, // allow us to recolor sides
      side: THREE.DoubleSide,
      // depthTest: false,
    })

    let wireframeMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 1,
      color: 0x00ff00,
      wireframe: true,
      wireframeLinewidth: 40,
      depthTest: false,
    })

    let mesh = new THREE.Mesh(geometry, material)
    mesh.renderOrder = 8;
    mesh.name = this.id
    let wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial)
    wireframeMesh.renderOrder = 9;

    // let cp = getCenterPoint(mesh)
    // console.log('Center point', cp)

    this.group.add(mesh)
    this.group.add(wireframeMesh)
    this.selectionMesh = mesh
    this.wireframeMesh = wireframeMesh

    // let boxes = addExpandedSelectionBox(mesh.geometry.vertices)

    // for (var box of boxes) {
    //   console.log('[box] expanded: ', box)
    //   box.computeBoundingBox();
    //   let _mesh = new THREE.Mesh(box, wireframeMaterial)
    //   this.expandMeshes.push(_mesh)
    //   global.scene.add(_mesh);
    // }
  }

  addSibling(mesh) {
    this.siblingMeshes.push(mesh)
  }

  showSiblings(align = true) {
    for (var mesh of this.siblingMeshes) {
      if (align) {
        mesh.geometry.center() // remove geometry offset
        let offset = this.selectionMesh.geometry.boundingSphere.center
        mesh.geometry.translate(offset.x, offset.y, offset.z)
        console.warn('translated', mesh, offset)
      }
      this.group.add(mesh)
    }
  }

  fromPoints(point1, point2, noTrans, data) {
    this.addSelectionBox(point1.floor(), point2.floor(), noTrans);
    let aabb = getAABB(point1, point2);
    this.point1 = aabb.min
    this.point2 = aabb.max
    let center = aabb.getCenter()//.floor();
    // pointC = center.clone()//.floor()
    // console.log('Center',point1,point2,center)
    this.selectionMesh.data = data
    this.group.position.copy(center)
    // for (var mesh of this.siblingMeshes) {
    //   // mesh.position.copy(center);
    //   mesh.geometry.translate(center.x, center.y, center.z);
    // }
    return center.clone()
  }

  emptyActiveFace() {
    if (this.activeFace) {
      for (var face of this.selectionMesh.geometry.faces) {
        face.color.setHex(0x880000) //reset the default color
      }
      this.activeFace = false;
    }
  }

  setActiveFace(n) {
    let updatedColors = false

    for (var face of this.selectionMesh.geometry.faces) {
      if (face.normal.equals(n)) {
        face.color.setHex(0x00ffff)
        // console.log('updated colors!')
        updatedColors = true
        this.activeFace = n.clone()
        // lastActiveFace = n.clone()
      } else {
        face.color.setHex(0x880000) //reset the default color
      }
    }

    if (updatedColors) {
      this.selectionMesh.geometry.colorsNeedUpdate = true
      // isMakingSelection = true
      // break;
    } else {
      // console.warn('Erased activeFace', n)
      this.emptyActiveFace()
    }
    // console.log('updated face', updatedColors)
    return updatedColors
  }

  recolorFaces() {
    for (var face of this.selectionMesh.geometry.faces) {
      face.color.setHex(this.color) //reset the default color
    }

    this.selectionMesh.geometry.colorsNeedUpdate = true
  }

  recolor(color) {
    this.selectionMesh.material.color.setHex(color)
  }

  getActiveFace() {
    return this.activeFace
  }

  // Returns primary BB
  getBoundingBox() {
    let box = new THREE.Box3()
    if (this.selectionMesh)
      return box.setFromObject(this.selectionMesh)
    return box
    // return this.selectionMesh.geometry.boundingBox
  }

  getRoundedBoundingBox() {
    let bb = this.getBoundingBox()
    if (!bb) {
      throw 'No active bounding box!'
    }
    return [bb.min.round(), bb.max.round().subScalar(1)]
  }

  getChunksInBB() {
    return getChunksInBB(this.getBoundingBox())
  }

  getChunksKeysInBB() {
    return this.getChunksInBB().map(([x, z]) => x + ',' + z)
  }

  expandActiveFace(factor) {
    if (!this.activeFace) {
      console.warn('[overlay] no active face')
      return
    }

    let mod = Math.floor(factor)

    let g = this.selectionMesh.geometry
    // console.log('EXPAND', mod, JSON.stringify(g.vertices))

    let ret = expandGeometry(g, this.activeFace, mod)
    // console.log('EXPANDed', JSON.stringify(g.vertices))
  }

  getSelectionVerts() {
    return this.selectionMesh.geometry.vertices
  }

  setSelectionVerts(verts) {
    for (var i = 0; i < verts.length; i++) {
      let vert = this.selectionMesh.geometry.vertices[i]
      vert.set(verts[i].x, verts[i].y, verts[i].z)
    }
    // return this.selectionMesh.geometry.vertices = verts
  }

  // Box is red
  markUnconfirmed() {
    this.color = this.unconfirmedColor
    this.recolorFaces()
  }

  // Box is green
  markConfirmed() {
    this.color = this.confirmedColor
    this.recolorFaces()
  }

  move(x, y, z) {
    this.group.position.set(x, y, z)
  }
}

function getAABB(pos1, pos2) {
  let minX = Math.min(pos1.x, pos2.x)
  let minY = Math.min(pos1.y, pos2.y)
  let minZ = Math.min(pos1.z, pos2.z)
  let maxX = Math.max(pos1.x, pos2.x)
  let maxY = Math.max(pos1.y, pos2.y)
  let maxZ = Math.max(pos1.z, pos2.z)
  return new THREE.Box3(new THREE.Vector3(minX, minY, minZ),
    new THREE.Vector3(maxX, maxY, maxZ))
}


function getCenterPoint(mesh) {
  var geometry = mesh.geometry;
  geometry.computeBoundingBox();
  center = geometry.boundingBox.getCenter();
  mesh.localToWorld(center);
  return center;
}

function addExpandedSelectionBox(vertices, factor = 20) {
  let xmin = ymin = zmin = Infinity
  let xmax = ymax = zmax = null

  // let face = lastActiveFace

  for (var vert of vertices) {
    xmin = vert.x < xmin ? vert.x : xmin
    ymin = vert.y < ymin ? vert.y : ymin
    zmin = vert.z < zmin ? vert.z : zmin
    xmax = vert.x > xmax ? vert.x : xmax
    ymax = vert.y > ymax ? vert.y : ymax
    zmax = vert.z > zmax ? vert.z : zmax
  }

  let xminVerts = [], yminVerts = [], zminVerts = []
  let xmaxVerts = [], ymaxVerts = [], zmaxVerts = []

  const expansion = factor

  for (var vert of vertices) {
    if (vert.x == xmin) xminVerts.push([vert.x, vert.y, vert.z], [vert.x - expansion, vert.y, vert.z])
    if (vert.y == ymin) yminVerts.push([vert.x, vert.y, vert.z], [vert.x, vert.y - expansion, vert.z])
    if (vert.z == zmin) zminVerts.push([vert.x, vert.y, vert.z], [vert.x, vert.y, vert.z - expansion])
    if (vert.x == xmax) xmaxVerts.push([vert.x, vert.y, vert.z], [vert.x + expansion, vert.y, vert.z])
    if (vert.y == ymax) ymaxVerts.push([vert.x, vert.y, vert.z], [vert.x, vert.y + expansion, vert.z])
    if (vert.z == zmax) zmaxVerts.push([vert.x, vert.y, vert.z], [vert.x, vert.y, vert.z + expansion])
  }

  let xminGeom = new THREE.BoxGeometry(), yminGeom = new THREE.BoxGeometry(), zminGeom = new THREE.BoxGeometry()
  let xmaxGeom = new THREE.BoxGeometry(), ymaxGeom = new THREE.BoxGeometry(), zmaxGeom = new THREE.BoxGeometry()

  xminGeom.vertices = xminVerts.map(e => new THREE.Vector3(...e))
  yminGeom.vertices = yminVerts.map(e => new THREE.Vector3(...e))
  zminGeom.vertices = zminVerts.map(e => new THREE.Vector3(...e))
  xmaxGeom.vertices = xmaxVerts.map(e => new THREE.Vector3(...e))
  ymaxGeom.vertices = ymaxVerts.map(e => new THREE.Vector3(...e))
  zmaxGeom.vertices = zmaxVerts.map(e => new THREE.Vector3(...e))
  xminGeom.axes = 'xmin'; yminGeom.axes = 'ymin'; zminGeom.axes = 'zmin'
  xmaxGeom.axes = 'xmax'; ymaxGeom.axes = 'ymax'; zmaxGeom.axes = 'zmax'

  // console.warn('XX', xminVerts, yminVerts, zminVerts, xmaxVerts, ymaxVerts, zmaxVerts)

  let geoms = [xminGeom, yminGeom, zminGeom, xmaxGeom, ymaxGeom, zmaxGeom]
  // for (var geom of geoms) {
  //   geom.translate(xmin, ymin, zmin)
  // }
  return geoms
}

function expandGeometry(geometry, face, mod) {
  let xmin = ymin = zmin = Infinity
  let xmax = ymax = zmax = null

  for (var vert of geometry.vertices) {
    xmin = vert.x < xmin ? vert.x : xmin
    ymin = vert.y < ymin ? vert.y : ymin
    zmin = vert.z < zmin ? vert.z : zmin
    xmax = vert.x > xmax ? vert.x : xmax
    ymax = vert.y > ymax ? vert.y : ymax
    zmax = vert.z > zmax ? vert.z : zmax
  }

  for (var vert of geometry.vertices) {
    if (face.x > 0 && vert.x == xmax) { vert.x += mod; }
    if (face.y > 0 && vert.y == ymax) { vert.y += mod; }
    if (face.z > 0 && vert.z == zmax) { vert.z += mod; }
    if (face.x < 0 && vert.x == xmin) { vert.x += mod; }
    if (face.y < 0 && vert.y == ymin) { vert.y += mod; }
    if (face.z < 0 && vert.z == zmin) { vert.z += mod; }
  }

  geometry.verticesNeedUpdate = true
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()

  return [new THREE.Vector3(xmin, ymin, zmin), new THREE.Vector3(xmax, ymax, zmax)]
}

function getChunksInBB(box) {
  let ret = []

  for (var x = box.min.x; x < box.max.x + 16; x += 16) {
    for (var z = box.min.z; z < box.max.z + 16; z += 16) {
      ret.push([x >> 4, z >> 4])
    }
  }

  return ret
}

// HOVER HIGHLIGHT

function createBlockHighlightMesh() {
  const geometry = new THREE.BoxGeometry(1.01, 1.01, 1.01)
  geometry.translate(0.5, 0.5, 0.5)

  let material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.5,
    color: 0xff0000,
    side: THREE.DoubleSide,
  })

  let mesh = new THREE.Mesh(geometry, material)
  mesh.renderOrder = 2
  return mesh
}

module.exports = { SelectionBox, createBlockHighlightMesh }