const PBlock = require('prismarine-block')

class BlockContainer {

  constructor(version, h, w, l, minX, minY, minZ, blocks) {
    this.version = version;
    this.Block = PBlock(version)
    this.h = h; this.w = w; this.l = l;
    this.minX = minX; this.minY = minY; this.minZ = minZ;
    this.size = h * w * l
    this.blocks = blocks || new Uint16Array(this.size)
  }

  setOffset(x = 0, y = 0, z = 0) {
    this.minX = x; this.minY = y; this.minZ = z;
  }

  getIndex(x, y, z) {
    let [X, Y, Z] = [x - this.minX, y - this.minY, z - this.minZ]
    // console.assert(X >= 0); console.assert(Y >= 0); console.assert(Z >= 0);
    // console.log('off', [x, y, z], [X, Y, Z])
    return (this.h * this.w * Z + this.w * Y + X)
  }

  getBlock({ x, y, z }) {
    let id = this.getBlockStateId(x, y, z)
    if (id == null) id = 0
    let block = this.Block.fromStateId(id)
    block.position = { x, y, z } //pviewer
    return block
  }

  setBlock(x, y, z, block) {
    this.setBlockStateId(x, y, z, block.stateId)
  }

  getBlockStateId(x, y, z) {
    let i = this.getIndex(x, y, z)
    return this.blocks[i]
  }

  setBlockStateId(x, y, z, blockStateId) {
    let i = this.getIndex(x, y, z)
    this.blocks[i] = blockStateId
  }

  static fromJson(string) {
    let p = JSON.parse(string)

    let blocks = new Uint16Array(atob(p.blocks).split("").map(
      (char) => char.charCodeAt(0)
    ));

    return new BlockContainer(p.version, p.h, p.w, p.l, p.minX, p.minY, p.minZ, blocks)
  }

  toJson() {
    let base64 = btoa(String.fromCharCode.apply(null, this.blocks));

    let { version, h, w, l, minX, minY, minZ } = this

    return JSON.stringify({
      version,
      h, w, l, minX, minY, minZ,
      blocks: base64
    });
  }
}

module.exports = { BlockContainer }