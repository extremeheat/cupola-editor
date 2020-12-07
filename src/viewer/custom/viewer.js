const { initialize } = require('../pviewer/index')
const CustomControls = require('../custom/controls')

async function sleep(ms) {
  return new Promise((res) => {
    setTimeout(() => {
      res();
    }, ms)
  })
}

class Viewer3D {

  constructor(viewerProvider) {
    this.selection = null
    this.lastCursorPos = new THREE.Vector2()
    this.provider = viewerProvider

    this.chunkCache = []
    this.chunkUnloadQueue = []

    this.raycaster = new THREE.Raycaster()
    this.mousePos = new THREE.Vector2()
  }

  async startViewer() {
    let init = await this.provider.init(this)
    let versionData = this.provider.getVersionData()
    initialize({
      onAnimate: this.onRender.bind(this),
      via: init.via,
      socketAddress: init.socketAddress,
      controls: CustomControls,
    })

    // If we use a socket provider, the init stuff happens
    // over socket so we don't need to postMessage
    if (versionData) {
      const { version, atlas, blockstates } = versionData
      window.postMessage({ type: 'initialize', version, blockstates, atlasURI: atlas, skipAO: false, noEmptyNeighborCulling: false })
    }

    // allow some time for page load...
    // TODO: Bypass double postMessage & call worker directly do this sync
    await sleep(100);

    this.onStarted()
  }

  onStarted() {
    this.provider.onStarted()
    this.registerHandlers()

    global.meshes = new THREE.Group()
    global.scene.add(global.meshes)
  }

  setCameraPosition(vec3) {
    window.postMessage({ type: 'position', pos: vec3, addMesh: false })
  }

  // 
  unloadChunk(cx, cz) {
    window.postMessage({ type: 'unloadChunk', x: cx * 16, z: cz * 16 })
    return true
  }

  // always send column
  addColumn(cx, cz, chunk) {
    let [bx, bz] = [cx * 16, cz * 16]
    global.world.addColumn(bx, bz, chunk.toJson())
  }

  // only send if unloaded
  showColumn(cx, cz, chunk) {
    let [bx, bz] = [cx * 16, cz * 16]
    if (!global.world.loadedChunks[bx + ',' + bz]) {
      return this.addColumn(cx, cz, chunk)
    }
  }

  isChunkLoaded(hash) {
    return global.world.loadedChunks[hash]
  }

  getLoadedChunks() {
    let keys = global.world.loadedChunks
    let ret = []
    for (var key in keys) {
      let [bx, bz] = key.split(',')
      ret.push(`${bx >> 4},${bz >> 4}`)
    }
    return ret
  }

  // DOM Events

  onPointerMove(event) {
    // calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components

    this.mousePos.x = (event.clientX / window.innerWidth) * 2 - 1
    this.mousePos.y = -(event.clientY / window.innerHeight) * 2 + 1
  }

  registerHandlers() {
    window.addEventListener('pointermove', this.onPointerMove.bind(this), true)
  }

  unregisterHandlers() {
    window.removeEventListener('pointermove', this.onPointerMove.bind(this))
  }

  // PViewer Event Handlers

  onRender() {
    // Add a highlight box around the lastCursorPos
    // update the picking ray with the camera and mouse position
    
  }

  onCameraMove(newPosition) {
    // 
    this.provider.onUpdate(newPosition)
  }
}

module.exports = Viewer3D