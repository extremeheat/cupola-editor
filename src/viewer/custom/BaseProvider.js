class ViwerProvider {
  constructor(version, center, viewDistance) {
    this.viewer = false;
    this.version = version
    this.center = center;
    this.viewDistance = viewDistance;
    this.atlas = null;
    this.blockstates = null;

    this.lastCameraPos = center.offset(0, 60, 0)
    this.chunkCache = {}
    this.loadedChunks = []
    this.lastVisibleChunks = []
    this.dirtyChunks = new Set()
    this.pendingSave = new Set()
    this.dirtyBlocks = 0
    // TODO: Combine these maybe?
    this.chunkResendTimer = null
    this.chunkTimer = null
  }

  async init(viewer) {
    this.viewer = viewer;
    [this.atlas, this.blockstates] = await this.prepare(this.version);
    return {
      via: 'electron'
    }
  }

  onStarted() {
    this.viewer.setCameraPosition(this.lastCameraPos)

    this.startChunkStream()
  }

  getVersionData() {
    if (!this.viewer) throw 'Not yet initialized';
    const { version, atlas, blockstates } = this
    return { version, atlas, blockstates }
  }

  getVisibleChunks(centerPos) {
    let [cx, cy, cz] = [centerPos.x >> 4, centerPos.y >> 4, centerPos.z >> 4]

    let visibleChunks = [];

    for (let x = cx - this.viewDistance; x <= cx + this.viewDistance; x++) {
      for (let z = cz - this.viewDistance; z <= cz + this.viewDistance; z++) {
        visibleChunks.push(x + ',' + z);
      }
    }

    // loading sort by manhattan distance
    visibleChunks.sort((a, b) => {
      const [x0, z0] = getXZ(a)
      const [x1, z1] = getXZ(b)
      let d0 = Math.abs(x0 - cx) + Math.abs(z0 - cz)
      let d1 = Math.abs(x1 - cx) + Math.abs(z1 - cz)
      return d0 - d1
    })

    return visibleChunks
  }

  saveChunks() {
    this.pendingSave.clear()
  }

  async tick() {
    this.ticking = true
    let cameraPos = this.lastCameraPos
    let visibleChunks = this.getVisibleChunks(cameraPos)
    // console.info('visible', visibleChunks.toString(), this.lastVisibleChunks.toString())
    if (!isEqual(this.lastVisibleChunks, visibleChunks)) {
      let [r, a] = getDifference(this.lastVisibleChunks, visibleChunks)
      console.info('[provider] Resending chunks - removed: ', r, 'added:', a)
      await this.sendChunks(visibleChunks)
    }

    // actually, DO NOT unload chunks because they
    // may be modified & pending user confirm to save to disk
    // for (var key in this.chunkCache) {
    //   if (!visibleChunks.includes(key)) {
    //     this.unloadChunk(key)
    //   }
    // }

    this.lastVisibleChunks = visibleChunks
    this.lastCameraPos = global.camera.position
    this.ticking = false
  }

  startChunkStream() {
    this.chunkTimer = setInterval(() => {
      if (this.ticking) {
        console.warn('[provider] still waiting for last tick')
        return
      }
      this.promise = this.tick()
    }, 2000)
  }

  isChunkLoaded(cx, cz) {
    return this.chunkCache[cx + ',' + cz]
  }

  loadChunk(cx, cz, chunk) {
    this.chunkCache[cx + ',' + cz] = chunk
  }

  // Note: if chunk still exists in this.pendingSave array,
  // chunk won't be GC'd - don't need extra logic here
  unloadChunk(cx, cz) {
    delete this.chunkCache[cx + ',' + cz]
  }

  async sendChunks(visibleChunks) {
    let unloadable = this.viewer.getLoadedChunks().filter(e => {
      return !visibleChunks.includes(e)
    })

    for (var key of visibleChunks) {
      const [x, z] = getXZ(key)
      let loaded = this.isChunkLoaded(x, z)
      if (!loaded) {
        // Only load the column if the chunk is not already in memory
        const chunk = await this.getChunk(x, z)
        this.loadChunk(x, z, chunk)
        if (!chunk) continue;
        this.viewer.showColumn(x, z, chunk)
      } else {
        this.viewer.showColumn(x, z, loaded)
      }
    }

    for (var e of unloadable) {
      const [x, z] = getXZ(e)
      this.viewer.unloadChunk(x, z)
    }

    return
  }

  update(cameraPosition) {
    // TODO: Render in more parts of world based on viewDistance
    this.lastCameraPos = cameraPosition;
  }

  sendDirtyChunks() {
    this.dirtyBlocks = 0

    console.log('[provider] sending dirty chunks', this.dirtyChunks)

    this.dirtyChunks.forEach(async k => {
      let [cx, cz] = k.split(',')
      const chunk = await this.getChunk(cx, cz)
      this.viewer.addColumn(cx, cz, chunk)
    })
    this.dirtyChunks.clear()
  }

  markDirtyChunk(cx, cz) {
    const key = `${cx},${cz}`
    this.dirtyChunks.add(key)
    this.pendingSave.add(key)
  }

  isChunkDirty(cx, cz) {
    const key = `${cx},${cz}`
    return this.dirtyChunks.has(key)
  }

  isChunkPendingSave(cx, cz) {
    const key = `${cx},${cz}`
    return this.pendingSave.has(key)
  }

  getBlock(x, y, z) { }

  setBlock(x, y, z, block) {
    this.dirtyBlocks++

    this.markDirtyChunk(x >> 4, z >> 4)

    // maximum dirty blocks we can have before we decide to resend whole
    // chunk to pviewer
    const MAX_DIRTY = 1

    clearTimeout(this.chunkResendTimer)
    this.chunkResendTimer = setTimeout(() => {
      if (this.dirtyBlocks > MAX_DIRTY) {
        this.sendDirtyChunks()
      } else {
        // TODO
      }
    }, 40)
  }
}

function getXZ(key) {
  let s = key.split(',')
  return [parseInt(s[0], 10), parseInt(s[1], 10)]
}

function isEqual(obj1, obj2) {
  return JSON.stringify(obj1) == JSON.stringify(obj2)
}

function getDifference(arr1, arr2) {
  let removed = arr1.filter(x => !arr2.includes(x));
  let added = arr2.filter(x => !arr1.includes(x));
  return [removed, added]
}

module.exports = ViwerProvider