let botMesh = null

function setCameraPosition(pos, addMesh, yaw, pitch) {
  console.log('setpos', pos, addMesh, yaw, pitch, global.firstPositionUpdate);

  if (yaw !== undefined && pitch !== undefined) {
    if (global.controls) {
      global.controls.dispose()
      global.controls = null
    }
    global.camera.position.set(pos.x, pos.y + 1.6, pos.z)
    global.camera.rotation.x = global.camera.rotation.x * 0.9 + pitch * 0.1
    global.camera.rotation.y = global.camera.rotation.y * 0.9 + yaw * 0.1
    return
  }
  if (pos.y > 0 && global.firstPositionUpdate) {
    global.controls.target.set(pos.x, pos.y, pos.z)
    global.camera.position.set(pos.x, pos.y + 20, pos.z + 20)
    global.controls.update()
    global.firstPositionUpdate = false
  }
  if (addMesh) {
    if (!botMesh) {
      const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6)
      geometry.translate(0, 0.9, 0)
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000 })
      botMesh = new THREE.Mesh(geometry, material)
      global.scene.add(botMesh)
    }
    botMesh.position.set(pos.x, pos.y, pos.z)
  }
}

function processCommand(data) {
  console.debug('[e->v] ', data)
  switch (data.type) {
    case 'initialize': {
      const cmd = data
      // init with version
      global.world.setVersion(cmd.version, cmd.blockstates, cmd.atlasURI, cmd.skipAO, cmd.noEmptyNeighborCulling)
      global.entities.clear()
      global.primitives.clear()
      console.log('[viewer] inited with version', data.version)
      break
    }
    case 'position': {
      let { pos, addMesh, yaw, pitch } = data
      setCameraPosition(pos, addMesh, yaw, pitch)
      break
    }
    case 'entity': {
      global.entities.update(data)
      break
    }
    case 'primitive': {
      global.primitives.update(data)
      break
    }
    case 'chunk': {
      const [x, z] = data.coords.split(',')
      global.world.addColumn(parseInt(x, 10), parseInt(z, 10), data.chunk)
      break
    }
    case 'unloadChunk': {
      let { x, z } = data
      global.world.removeColumn(x, z)
      break
    }
    case 'blockUpdate': {
      let { pos, stateId } = data
      global.world.setBlockStateId(new Vec3(pos.x, pos.y, pos.z), stateId)
      break
    }
  }
}

module.exports = { setCameraPosition, processCommand }