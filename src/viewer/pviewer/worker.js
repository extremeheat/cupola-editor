/* global XMLHttpRequest postMessage self performance */

const { Vec3 } = require('vec3')
const { World } = require('./world')
const { getSectionGeometry } = require('./models')
// https://github.com/electron/electron/issues/2288#issuecomment-123147993
const isElectron = globalThis.process && globalThis.process.type
const { BlockContainer } = require('./blockcontainer')

function getJSON (url, callback) {
  const xhr = new XMLHttpRequest()
  xhr.open('GET', url, true)
  xhr.responseType = 'json'
  xhr.onload = function () {
    const status = xhr.status
    if (status === 200) {
      callback(null, xhr.response)
    } else {
      callback(status, xhr.response)
    }
  }
  xhr.send()
}

let blocksStates = null
if (!isElectron) {
  getJSON('blocksStates.json', (err, json) => {
    if (err) return
    blocksStates = json
  })
}

let world = null

function sectionKey (x, y, z) {
  return `${x},${y},${z}`
}

const dirtySections = {}

function setSectionDirty (pos, value = true) {
  const x = Math.floor(pos.x / 16) * 16
  const y = Math.floor(pos.y / 16) * 16
  const z = Math.floor(pos.z / 16) * 16
  const chunk = world.getColumn(x, z)
  if (chunk && chunk.sections[Math.floor(y / 16)]) {
    const key = sectionKey(x, y, z)
    dirtySections[key] = value
    if (!dirtySections[key]) delete dirtySections[key]
  }
}

self.onmessage = ({ data }) => {
  if (data.type === 'version') {
    world = new World(data.version)
    blocksStates = blocksStates || data.states
    globalThis.noEmptyNeighborCulling = data.noEmptyNeighborCulling
    globalThis.skipAO = data.skipAO
  } else if (data.type === 'dirty') {
    const loc = new Vec3(data.x, data.y, data.z)
    setSectionDirty(loc, data.value)
  } else if (data.type === 'chunk') {
    world.addColumn(data.x, data.z, data.chunk)
  } else if (data.type === 'unloadChunk') {
    world.removeColumn(data.x, data.z)
  } else if (data.type === 'blockUpdate') {
    const loc = new Vec3(data.pos.x, data.pos.y, data.pos.z).floored()
    world.setBlockStateId(loc, data.stateId)
  } else if (data.type == 'computeGeometry') {
    specialGeometryRequest(data.container)
  }
}

function specialGeometryRequest (json) {
  let world = BlockContainer.fromJson(json)
  const geometry = getSectionGeometry(0, 0, 0, world, blocksStates, world.h, world.w, world.l, true)
  const transferable = [geometry.positions.buffer, geometry.normals.buffer, geometry.colors.buffer, geometry.uvs.buffer]
  postMessage({ type: 'specialGeometry', geometry }, transferable)
}

setInterval(() => {
  if (!world || !blocksStates) return
  const sections = Object.keys(dirtySections)

  if (sections.length === 0) return
  console.log(sections.length + ' dirty sections')

  const start = performance.now()
  for (const key of sections) {
    let [x, y, z] = key.split(',')
    x = parseInt(x, 10)
    y = parseInt(y, 10)
    z = parseInt(z, 10)
    const chunk = world.getColumn(x, z)
    if (chunk && chunk.sections[Math.floor(y / 16)]) {
      delete dirtySections[key]
      const geometry = getSectionGeometry(x, y, z, world, blocksStates)
      const transferable = [geometry.positions.buffer, geometry.normals.buffer, geometry.colors.buffer, geometry.uvs.buffer]
      postMessage({ type: 'geometry', key, geometry }, transferable)
    }
  }
  const time = performance.now() - start
  console.log(`Processed ${sections.length} sections in ${time} ms (${time / sections.length} ms/section)`)
}, 50)
