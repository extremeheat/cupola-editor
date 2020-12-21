const DemoViewerProvider = require('./DemoProvider')
const DemoWorldViewerProvider = require('./DemoWorldProvider')
const Editor3D = require('./editor')

global.viewerProvider = null
global.viewer = null

function init() {
  // Controlers:
  //  Controller3D -> 3D overworld map
  //  Controller2D -> 2D chunk map
  global.viewerProvider = new DemoViewerProvider('1.13')
  // viewerProvider = new DemoWorldViewerProvider('1.16')
  global.viewer = new Editor3D(global.viewerProvider)
  global.viewer.startViewer()
}

init()

// global.debugRaycasts = true