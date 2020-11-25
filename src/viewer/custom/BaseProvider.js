class ViwerProvider {

  constructor(version, center, viewDistance) {
    this.viewer = false;
    this.version = version
    this.center = center;
    this.viewDistance = viewDistance;
    this.atlas = null;
    this.blockstates = null;

    this.lastCameraPos = center.offset(0, 60, 0);
    this.loadedChunks = [];
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

    this.sendChunks()
  }

  getVersionData() {
    if (!this.viewer) throw 'Not yet initialized';
    const { version, atlas, blockstates } = this
    return { version, atlas, blockstates }
  }

  async sendChunks() {
    let centerPos = this.lastCameraPos
    let [cx, cy, cz] = [centerPos.x >> 4, centerPos.y >> 4, centerPos.z >> 4]

    let visibleChunks = [];

    for (let x = cx - this.viewDistance; x <= cx + this.viewDistance; x++) {
      for (let z = cz - this.viewDistance; z <= cz + this.viewDistance; z++) {
        // const coords = `${x * 16},${z * 16}`
        // const chunk = (await viewer.world.getColumn(x, z)).toJson()
        // console.warn('Send', { type: 'chunk', coords: coords, chunk: chunk })
        // window.postMessage({ type: 'chunk', coords: coords, chunk: chunk });
        // global.world.addColumn(x, z, chunk);
        visibleChunks.push([x, z]);
      }
    }

    let unloadable = this.viewer.getLoadedChunks().filter(e => {
      const k = e.split(',')
      return !visibleChunks.includes(k)
    })

    for (var [x, z] of visibleChunks) {
      const ckey = `${x},${z}`
      if (!this.viewer.isChunkLoaded(ckey)) {
        // Only load the column if the chunk is not already in memory
        const chunk = await this.getChunk(x, z)
        if (!chunk) continue;
        this.viewer.addColumn(x, z, chunk)
      } else {
        // It's possible the chunk is still in memory, so show the
        // chunk in the viewer now. Happens if we make edits and
        // we move away from a modified chunk
        this.viewer.showColumn(x, z)
      }
    }

    for (var e of unloadable) {
      const [x, z] = e.split(',')
      this.viewer.tryUnloadChunk(x, z)
    }
  }

  update(cameraPosition) {
    // TODO: Render in more parts of world based on viewDistance
    this.lastCameraPos = cameraPosition;
  }
}

module.exports = ViwerProvider