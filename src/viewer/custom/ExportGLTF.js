/* eslint-disable */
require('three/examples/js/exporters/GLTFExporter')

var link = document.createElement('a')
function save(blob, filename) {
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}

function saveString(text, filename) {
  save(new Blob([text], { type: 'text/plain' }), filename)
}


function saveArrayBuffer(buffer, filename) {
  save(new Blob([buffer], { type: 'application/octet-stream' }), filename)
}

// Instantiate a exporter
var exporter = new THREE.GLTFExporter()

function exportGLTF() {
  // Parse the input and generate the glTF output
  exporter.parse(scene, function (gltf) {
    console.log(gltf)
    const output = JSON.stringify(gltf, null, 2)
    saveString(output, 'scene.gltf')
  })
}