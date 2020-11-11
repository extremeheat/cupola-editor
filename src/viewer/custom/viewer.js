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
      window.postMessage({ type: 'initialize', version, blockstates, atlasURI: atlas, skipAO: false, noEmptyNeighborCulling: true })
    }

    // allow some time for page load...
    // TODO: Bypass double postMessage & call worker directly do this sync
    await sleep(100);

    this.onStarted()
  }

  onStarted() {
    this.provider.onStarted()
    this.registerHandlers()
  }

  setCameraPosition(vec3) {
    window.postMessage({ type: 'position', pos: vec3, addMesh: false })
  }

  // 
  markModifiedColumn(column) {
    column.dirty = true;
  }

  tryUnloadChunk(x, z) {
    let cached = this.getCachedChunk(x, z)
    let key = `${x},${z}`
    if (!cached && this.isChunkLoaded(key)) {
      let [bx, bz] = [x * 16, z * 16]
      window.postMessage({ type: 'unloadChunk', x: bx, z: bz })
      return true
    } else if (cached.dirty) {
      if (!this.chunkUnloadQueue.includes([x, z])) {
        this.chunkUnloadQueue.push([x, z])
      }
    }
    return false
  }

  unloadChunks() {
    let unloaded = []
    for (var [x, z] of this.chunkUnloadQueue) {
      if (this.tryUnloadChunk(x, z)) unloaded.push([x, z])
    }
    this.chunkUnloadQueue.filter(e => !unloaded.includes(e))
  }

  // Gets (cached) chunk if we modified it
  getCachedChunk(x, z) {
    let key = `${x},${z}`
    return this.chunkCache[key]
  }

  addColumn(x, z, chunk) {
    let [bx, bz] = [x * 16, z * 16]
    let key = `${x},${z}`
    if (!this.chunkCache[key]) {
      this.chunkCache[key] = chunk
    }
    global.world.addColumn(bx, bz, chunk.toJson())
    console.log('addColumn', x, z, chunk)
  }

  showColumn() {
    return this.addColumn(arguments);
  }

  // Check if we can unload any chunks
  processChunks() {

  }

  getLoadedChunks() {
    return [
      ...Object.keys(global.world.loadedChunks),
      ...Object.keys(this.chunkCache)
    ]
  }

  isChunkLoaded(hash) {
    return global.world.loadedChunks[hash]
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