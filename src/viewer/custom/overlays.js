class SelectionBox {
  constructor() {
    this.selectionMesh = null
    // Outline
    this.wireframeMesh = null

    this.activeFace = null

    // Used for expanding selection box
    this.expandMeshes = []
  }

  clear() {
    if (this.selectionMesh)
      global.scene.remove(this.selectionMesh)
    if (this.wireframeMesh)
      global.scene.remove(this.wireframeMesh)

    for (var _mesh of this.expandMeshes) {
      global.scene.remove(_mesh)
    }
  }

  addSelectionBox(pos1, pos2) {
    this.clear()
    console.log('Create box from ', pos1, pos2)

    let height = Math.abs(Math.min(pos1.y, pos2.y) - Math.max(pos1.y, pos2.y)) + 1.01
    let width = Math.abs(Math.min(pos1.x, pos2.x) - Math.max(pos1.x, pos2.x)) + 1.01
    let length = Math.abs(Math.min(pos1.z, pos2.z) - Math.max(pos1.z, pos2.z)) + 1.01
    console.log('[box] HWL', height, width, length, pos1, pos2)

    let geometry = new THREE.BoxGeometry(width, height, length)
    geometry.translate(0.5, 0.5, 0.5)

    let material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.5,
      color: 0x880000,
      vertexColors: THREE.FaceColors, // allow us to recolor sides
      depthTest: false,
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
    mesh.name = "selection"
    let wireframeMesh = new THREE.Mesh(geometry, wireframeMaterial)
    wireframeMesh.renderOrder = 9;
  
    let cp = getCenterPoint(mesh)
    console.log('Center point', cp)
  
    global.scene.add(mesh)
    global.scene.add(wireframeMesh)
    this.selectionMesh = mesh
    this.wireframeMesh = wireframeMesh

    let boxes = addExpandedSelectionBox(mesh.geometry.vertices)
    
    for (var box of boxes) {
      console.log('[box] expanded: ', box)
      box.computeBoundingBox();
      let _mesh = new THREE.Mesh(box, wireframeMaterial)
      this.expandMeshes.push(_mesh)
      global.scene.add(_mesh);
    }
  }

  fromPoints(point1, point2) {
    this.addSelectionBox(point1.floor(), point2.floor());
    let aabb = getAABB(point1, point2);
    let center = aabb.getCenter()//.floor();
    // pointC = center.clone()//.floor()
    // console.log('Center',point1,point2,center)
    this.selectionMesh.position.copy(center)
    this.wireframeMesh.position.copy(center)
    for (var mesh of this.expandMeshes) {
      // mesh.position.copy(center);
      mesh.geometry.translate(center.x, center.y, center.z);
    }
    return center.clone()
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
      this.activeFace = null
    }
    return updatedColors
  }

  // Box is red
  markUnconfirmed() {

  }

  // Box is green
  markConfirmed() {

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

function addExpandedSelectionBox(vertices) {
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

  const expansion = 20

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

  console.warn('XX', xminVerts, yminVerts, zminVerts, xmaxVerts, ymaxVerts, zmaxVerts)

  let geoms = [xminGeom, yminGeom, zminGeom, xmaxGeom, ymaxGeom, zmaxGeom]
  // for (var geom of geoms) {
  //   geom.translate(xmin, ymin, zmin)
  // }
  return geoms
}

// HOVER HIGHLIGHT

function addBlockHighlight() {
  const geometry = new THREE.BoxGeometry(1.01, 1.01, 1.01)
  geometry.translate(0.5, 0.5, 0.5)

  let material = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.5,
    color: 0xff0000,
    side: THREE.DoubleSide,

    // depthWrite: false // :D
    // side: THREE.BackSide
  });

  let material2 = new THREE.MeshBasicMaterial({
    // transparent: false,
    opacity: 1,
    color: 0xff0000,
    side: THREE.DoubleSide,
    // wireframe: true,
    wireframeLinewidth: 40,
    depthTest: false
    // depthWrite: false,
    // depthWrite: false // :D
    // side: THREE.BackSide
  });



  let mesh = new THREE.Mesh(geometry, material)
  let mesh2 = new THREE.Mesh(geometry, material2)
  // setInterval(() => {
  //   mesh.translateY(1);
  // }, 2000)

  // global.scene.add(mesh2)
  mesh.renderOrder = 2;

  global.scene.add(mesh)
  // global.myMesh = mesh;
  // global.scene.add(mesh2)

  return mesh
}

module.exports = { SelectionBox, addBlockHighlight }