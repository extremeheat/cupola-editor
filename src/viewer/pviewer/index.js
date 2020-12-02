/* global THREE */
global.THREE = require('three')
require('three/examples/js/controls/OrbitControls')
require('three/examples/js/controls/TransformControls')
const { WorldRenderer } = require('./worldrenderer')
const { Entities } = require('./entities')
const { Primitives } = require('./primitives')
const controller = require('./controller')
const Vec3 = require('vec3').Vec3

function initialize(options = {}) {
  const defaultOpts = {
    via: 'socket',
    socketAddress: undefined,
    controls: THREE.OrbitControls,
    onAnimate: null
  }
  options = { ...defaultOpts, ...options }

  console.log('[viewer] init')
  createScene()
  startRenderer(options.controls, options.onAnimate)
  if (options.via == 'socket') {
    startSocketListener(options.socketAddress)
  } else {
    startMessageListener()
  }
}

function createScene() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('lightblue')

  const ambientLight = new THREE.AmbientLight(0xcccccc)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
  directionalLight.position.set(1, 1, 0.5).normalize()
  scene.add(directionalLight)

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.z = 5

  const world = new WorldRenderer(scene)
  const entities = new Entities(scene)
  const primitives = new Primitives(scene)

  global.scene = scene
  global.firstPositionUpdate = true
  global.camera = camera
  global.world = world
  global.entities = entities
  global.primitives = primitives
}

function startRenderer(controlClass, onAnimate) {
  const renderer = new THREE.WebGLRenderer()

  renderer.setPixelRatio(window.devicePixelRatio / 1.25 || 1)
  renderer.setSize(window.innerWidth, window.innerHeight)
  const element = document.body.appendChild(renderer.domElement)

  let controls = new controlClass(camera, renderer.domElement)
  global.controls = controls

  const transformControls = new THREE.TransformControls(camera, renderer.domElement)
  transformControls.translationSnap = 1 // snapping to world
  global.transformControls = transformControls

  function animate() {
    window.requestAnimationFrame(animate)
    stats.begin() // MCEditor - show FPS
    if (controls) controls.update()
    renderer.render(scene, camera)
    if (onAnimate) onAnimate()
    stats.end() // MCEditor - show FPS
  }
  animate()
}

function startSocketListener() {
  const io = require('socket.io-client')
  const socket = io()

  socket.on('version', (version, blockStates) => {
    console.log('Using version: ' + version)
    world.setVersion(version, blockStates)
    entities.clear()
    primitives.clear()
    firstPositionUpdate = true

    socket.on('position', ({ pos, addMesh, yaw, pitch }) => {
      controller.setCameraPosition(pos, addMesh, yaw, pitch)
    })

    socket.on('entity', (e) => {
      entities.update(e)
    })

    socket.on('primitive', (p) => {
      primitives.update(p)
    })

    socket.on('chunk', (data) => {
      const [x, z] = data.coords.split(',')
      world.addColumn(parseInt(x, 10), parseInt(z, 10), data.chunk)
    })

    socket.on('unloadChunk', ({ x, z }) => {
      world.removeColumn(x, z)
    })

    socket.on('blockUpdate', ({ pos, stateId }) => {
      world.setBlockStateId(new Vec3(pos.x, pos.y, pos.z), stateId)
    })
  })
}

function startMessageListener() {
  window.addEventListener('message', function (event) {
    console.log(event)
    let parent = event.origin
    let data = event.data

    controller.processCommand(data);
  })
}

if (typeof module != 'undefined') {
  module.exports = { initialize }
}