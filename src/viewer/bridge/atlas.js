const fs = require('fs')
// const { Canvas, Image } = require('canvas')
const path = require('path')

async function makeTextureAtlas(mcAssets) {
  const blocksTexturePath = path.join(mcAssets.directory, '/blocks')
  const textureFiles = fs.readdirSync(blocksTexturePath).filter(file => file.endsWith('.png'))
  console.log('[atlas] loading',blocksTexturePath, textureFiles.length)
  const texSize = Math.ceil(Math.sqrt(textureFiles.length))
  const tileSize = 16

  const imgSize = texSize * tileSize
  const canvas = new OffscreenCanvas(imgSize, imgSize, 'png')
  const g = canvas.getContext('2d')

  const texturesIndex = {}
  let waits = 0;

  for (const i in textureFiles) {
    const x = (i % texSize) * tileSize
    const y = Math.floor(i / texSize) * tileSize

    const name = textureFiles[i].split('.')[0]

    texturesIndex[name] = { u: x / imgSize, v: y / imgSize, su: tileSize / imgSize, sv: tileSize / imgSize }

    const img = new Image()
    waits++
    img.onload = function() {
      waits--
      g.drawImage(img, 0, 0, 16, 16, x, y, 16, 16)
      // console.log('draw', img.src, 0, 0, 16, 16, x, y, 16, 16)
    }
    // img.src = 'data:image/png;base64,' + fs.readFileSync(path.join(blocksTexturePath, textureFiles[i]), 'base64')
    img.src = path.join(blocksTexturePath, textureFiles[i])

    // console.log(img.src);
  }

  // Since the images are loaded async,
  // we need to wait for them all to load in
  // as fs doesn't seem to work properly on the
  // render thread
  await new Promise(res => {
    let timer = setInterval(() => {
      if (waits == 0) {
        clearInterval(timer);
        // console.log('[atlas] created image');
        // await blobToDataURL(await canvas.convertToBlob())
        // console.log(canvas.toDataURL())
        res();
      }
    }, 400);
  })

  let ret = { json: { size: tileSize / imgSize, textures: texturesIndex } }

  ret.image = typeof window == 'undefined' ? canvas.toBuffer() : await canvas.convertToBlob()
  ret.imageURI = typeof window == 'undefined' ? undefined : URL.createObjectURL(ret.image)
  console.log('[atlas] created blob: ', ret.imageURI)
  return ret
}

module.exports = {
  makeTextureAtlas
}