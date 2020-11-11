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

class DemoViewerProvider extends ViwerProvider {
  constructor(version, generator = defaultGenerator, center = new Vec3(0, 0, 0), viewDistance = 1) {
    super(center, viewDistance)
    this.version = version;
    this.generator = generator;

    this.World = require('prismarine-world')(version);
    this.Chunk = require('prismarine-chunk')(version);
  }

  async prepare(version) {
    return await prepare(version)
  }

  async getChunk(chunkX, chunkZ) {
    const chunk = new this.Chunk()
    for (let y = 0; y < 256; y++) {
      for (let x = 0; x < 16; x++) {
        for (let z = 0; z < 16; z++) {
          chunk.setBlockStateId(new Vec3(x, y, z), this.generator(chunkX * 16 + x, y, chunkZ * 16 + z))
        }
      }
    }
    return chunk;
  }
}

module.exports = DemoViewerProvider;