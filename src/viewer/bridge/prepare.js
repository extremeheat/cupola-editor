const { makeTextureAtlas } = require('./atlas');
const { prepareBlocksStates } = require('./models')

async function prepareAssets(version) {
    const mcAssets = require('minecraft-assets')(version)
    const atlas = await makeTextureAtlas(mcAssets)
    const blocksStates = prepareBlocksStates(mcAssets, atlas)
    console.warn(version, atlas, blocksStates);
    return [ atlas.imageURI, blocksStates ]
}

module.exports = prepareAssets