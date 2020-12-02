const { TouchBarOtherItemsProxy } = require('electron');
const { Vec3 } = require('vec3');
const ViwerProvider = require('./BaseProvider');

const prepareAssets = require('../bridge/prepare');

// TODO: Refactor this to use IPC to pre-generate atlas/blockstate
// data for quick access
async function prepare(version) {
  console.info('Preping...');
  // let { uri, blockstates } = await ipcRenderer.invoke('prepare', version);
  let [uri, blockstates] = await prepareAssets(version);

  return [uri, blockstates];
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function defaultGenerator(x, y, z) {
  if (y < 30) return getRandomInt(0, 10);
  if (y > 0) return 0
  return 1
}

function chunkKey(cx, cz) {
  return cx + ',' + cz
}

class DemoViewerProvider extends ViwerProvider {
  constructor(version, generator = defaultGenerator, center = new Vec3(0, 0, 0), viewDistance = 4) {
    super(version, center, viewDistance)
    this.generator = generator;

    this.World = require('prismarine-world')(version);
    this.Chunk = require('prismarine-chunk')(version);

    this.world = new this.World(this.getChunk.bind(this))

    this.chunks = []
  }

  async prepare(version) {
    return await prepare(version)
  }

  getChunk(chunkX, chunkZ) {
    let key = chunkKey(chunkX, chunkZ)
    if (this.chunks[key]) return this.chunks[key]
    const chunk = new this.Chunk()
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 16; x++) {
        for (let z = 0; z < 16; z++) {
          chunk.setBlockStateId(new Vec3(x, y, z), this.generator(chunkX * 16 + x, y, chunkZ * 16 + z))
        }
      }
    }
    this.chunks[key] = chunk;
    return chunk;
  }

  getBlock(x, y, z) {
    let [cx, cz] = [x >> 4, z >> 4]
    let cc = this.getChunk(cx, cz)
    return cc.getBlock(new Vec3(x, y, z))
  }

  async setBlock(x, y, z, block) { 
    await this.world.setBlock({ x, y, z }, block)

    super.setBlock(x, y, z, block)
  }

  async setBlockStateId(x, y, z, block) { 
    await this.world.setBlockStateId({ x, y, z }, block)

    super.setBlock(x, y, z, block)
  }
}

module.exports = DemoViewerProvider;