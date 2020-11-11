const DemoViewerProvider = require('./DemoProvider');
const Editor3D = require('./editor')

var viewerProvider = null;
var viewer = null;

function init() {
  // Controlers:
  //  Controller3D -> 3D overworld map
  //  Controller2D -> 2D chunk map
  viewerProvider = new DemoViewerProvider('1.13')
  // viewerProvider = new DemoWorldViewerProvider('1.16')
  viewer = new Editor3D(viewerProvider)
  viewer.startViewer()
}

init()