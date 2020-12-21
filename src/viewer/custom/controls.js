/* eslint-disable */
// Similar to THREE MapControls with more Minecraft-like
// controls.
// Shift = Move Down, Space = Move Up, WSAD to move NSWE
// + Add a translateY() to translate camera and adjust target
// + Controls are ticked on update instead of on key down so
//   multiple keys may be down at same time

const STATE = {
    NONE: - 1,
    ROTATE: 0,
    DOLLY: 1,
    PAN: 2,
    TOUCH_ROTATE: 3,
    TOUCH_PAN: 4,
    TOUCH_DOLLY_PAN: 5,
    TOUCH_DOLLY_ROTATE: 6
};

class CustomControls {
    constructor(object, domElement) {
        this.rotOrigin = null
        this.enabled = true
        this.object = object
        this.element = domElement

        // Mouse buttons
        this.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };

        this.controlMap = {
            MOVE_FORWARD: 'KeyW',
            MOVE_BACKWARD: 'KeyS',
            MOVE_LEFT: 'KeyA',
            MOVE_RIGHT: 'KeyD',
            MOVE_DOWN: 'ShiftLeft',
            MOVE_UP: 'Space'
        }

        this.target = new THREE.Vector3();

        // How far you can dolly in and out ( PerspectiveCamera only )
        this.minDistance = 0;
        this.maxDistance = Infinity;

        // How far you can zoom in and out ( OrthographicCamera only )
        this.minZoom = 0;
        this.maxZoom = Infinity;

        // How far you can orbit vertically, upper and lower limits.
        // Range is 0 to Math.PI radians.
        this.minPolarAngle = 0; // radians
        this.maxPolarAngle = Math.PI; // radians

        // How far you can orbit horizontally, upper and lower limits.
        // If set, the interval [ min, max ] must be a sub-interval of [ - 2 PI, 2 PI ], with ( max - min < 2 PI )
        this.minAzimuthAngle = - Infinity; // radians
        this.maxAzimuthAngle = Infinity; // radians

        // Set to true to enable damping (inertia)
        // If damping is enabled, you must call controls.update() in your animation loop
        this.enableDamping = false;
        this.dampingFactor = 0.01;

        // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
        // Set to false to disable zooming
        this.enableZoom = true;
        this.zoomSpeed = 1.0;

        // Set to false to disable rotating
        this.enableRotate = true;
        this.rotateSpeed = 1.0;

        // Set to false to disable panning
        this.enablePan = true;
        this.panSpeed = 1.0;
        this.screenSpacePanning = false; // if false, pan orthogonal to world-space direction camera.up
        this.keyPanSpeed = 20;	// pixels moved per arrow key push

        this.keyDowns = [];

        // State-related stuff

        this.changeEvent = { type: 'change' };
        this.startEvent = { type: 'start' };
        this.endEvent = { type: 'end' };

        this.state = STATE.NONE;

        this.EPS = 0.000001;

        this.spherical = new THREE.Spherical();
        this.sphericalDelta = new THREE.Spherical();

        this.scale = 1;
        this.panOffset = new THREE.Vector3();
        this.zoomChanged = false;

        this.rotateStart = new THREE.Vector2();
        this.rotateEnd = new THREE.Vector2();
        this.rotateDelta = new THREE.Vector2();

        this.panStart = new THREE.Vector2();
        this.panEnd = new THREE.Vector2();
        this.panDelta = new THREE.Vector2();

        this.dollyStart = new THREE.Vector2();
        this.dollyEnd = new THREE.Vector2();
        this.dollyDelta = new THREE.Vector2();

        // for reset
        this.target0 = this.target.clone();
        this.position0 = this.object.position.clone();
        this.zoom0 = this.object.zoom;

        this.ticks = 0;

        // 
        this.registerHandlers();
    }

    setRotationOrigin() {

    }

    unsetRotationOrigin() {

    }

    // 

    //
    // public methods
    //

    getPolarAngle() {
        return this.spherical.phi;
    }

    getAzimuthalAngle() {
        return this.spherical.theta;
    }

    saveState() {
        this.target0.copy(this.target);
        this.position0.copy(this.object.position);
        this.zoom0 = this.object.zoom;
    }

    reset() {
        this.target.copy(this.target0);
        this.object.position.copy(this.position0);
        this.object.zoom = this.zoom0;

        this.object.updateProjectionMatrix();
        this.dispatchEvent(changeEvent);

        this.update(true);

        this.state = STATE.NONE;
    }

    // this method is exposed, but perhaps it would be better if we can make it private...
    update(force) {

        // MCEditor - tick controls if called from render loop
        if (!force) {
            if ((this.ticks++ % 2) == 0) {
                this.tickContols()
            }
        }
        // MCEditor End

        var offset = new THREE.Vector3();

        // so camera.up is the orbit axis
        var quat = new THREE.Quaternion().setFromUnitVectors(this.object.up, new THREE.Vector3(0, 1, 0));
        var quatInverse = quat.clone().inverse();

        var lastPosition = new THREE.Vector3();
        var lastQuaternion = new THREE.Quaternion();

        var twoPI = 2 * Math.PI;

        var position = this.object.position;
        offset.copy(position).sub(this.target);

        // rotate offset to "y-axis-is-up" space
        offset.applyQuaternion(quat);

        // angle from z-axis around y-axis
        this.spherical.setFromVector3(offset);

        if (this.autoRotate && this.state === STATE.NONE) {
            this.rotateLeft(this.getAutoRotationAngle());
        }

        if (this.enableDamping) {
            this.spherical.theta += this.sphericalDelta.theta * this.dampingFactor;
            this.spherical.phi += this.sphericalDelta.phi * this.dampingFactor;
        } else {
            this.spherical.theta += this.sphericalDelta.theta;
            this.spherical.phi += this.sphericalDelta.phi;
        }

        // restrict theta to be between desired limits
        var min = this.minAzimuthAngle;
        var max = this.maxAzimuthAngle;

        if (isFinite(min) && isFinite(max)) {
            if (min < - Math.PI) min += twoPI; else if (min > Math.PI) min -= twoPI;
            if (max < - Math.PI) max += twoPI; else if (max > Math.PI) max -= twoPI;
            if (min < max) {
                this.spherical.theta = Math.max(min, Math.min(max, this.spherical.theta));
            } else {
                this.spherical.theta = (this.spherical.theta > (min + max) / 2) ?
                    Math.max(min, this.spherical.theta) :
                    Math.min(max, this.spherical.theta);
            }
        }

        // restrict phi to be between desired limits
        this.spherical.phi = Math.max(this.minPolarAngle, Math.min(this.maxPolarAngle, this.spherical.phi));
        this.spherical.makeSafe();
        this.spherical.radius *= this.scale;

        // restrict radius to be between desired limits
        this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

        // move target to panned location
        if (this.enableDamping === true) {
            this.target.addScaledVector(this.panOffset, this.dampingFactor);
        } else {
            this.target.add(this.panOffset);
        }

        offset.setFromSpherical(this.spherical);

        // rotate offset back to "camera-up-vector-is-up" space
        offset.applyQuaternion(quatInverse);

        position.copy(this.target).add(offset);

        this.object.lookAt(this.target);

        if (this.enableDamping === true) {
            this.sphericalDelta.theta *= (1 - this.dampingFactor);
            this.sphericalDelta.phi *= (1 - this.dampingFactor);
            this.panOffset.multiplyScalar(1 - this.dampingFactor);
        } else {
            this.sphericalDelta.set(0, 0, 0);
            this.panOffset.set(0, 0, 0);
        }

        this.scale = 1;

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8

        if (this.zoomChanged ||
            lastPosition.distanceToSquared(this.object.position) > this.EPS ||
            8 * (1 - lastQuaternion.dot(this.object.quaternion)) > this.EPS) {

            // this.dispatchEvent(changeEvent);

            lastPosition.copy(this.object.position);
            lastQuaternion.copy(this.object.quaternion);
            this.zoomChanged = false;

            return true;
        }

        return false;
    }

    // -- ORBIT CONTROLS --

    getAutoRotationAngle() {
        return 2 * Math.PI / 60 / 60 * this.autoRotateSpeed;
    }

    getZoomScale() {
        return Math.pow(0.95, this.zoomSpeed);
    }

    rotateLeft(angle) {
        this.sphericalDelta.theta -= angle;
    }

    rotateUp(angle) {
        this.sphericalDelta.phi -= angle;
    }

    panLeft(distance, objectMatrix) {
        let v = new THREE.Vector3();

        v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
        v.multiplyScalar(- distance);

        this.panOffset.add(v);
    }

    panUp(distance, objectMatrix) {
        let v = new THREE.Vector3();

        if (this.screenSpacePanning === true) {
            v.setFromMatrixColumn(objectMatrix, 1);
        } else {
            v.setFromMatrixColumn(objectMatrix, 0);
            v.crossVectors(this.object.up, v);
        }

        v.multiplyScalar(distance);

        this.panOffset.add(v);
    }

    // MCEditor - translate Y and update target
    // https://stackoverflow.com/q/38311651/11173996
    translateY(delta) { 
        camera.position.y += delta;
        this.target.add(new THREE.Vector3(0, delta, 0));
        // control.target.set(camera.position.y, myCameraY,0);
        // this.
        // this.object.translateY(delta)
    }

    // deltaX and deltaY are in pixels; right and down are positive
    pan(deltaX, deltaY) {
        let offset = new THREE.Vector3();

        const element = this.element;

        if (this.object.isPerspectiveCamera) {
            // perspective
            var position = this.object.position;
            offset.copy(position).sub(this.target);
            var targetDistance = offset.length();

            // half of the fov is center to top of screen
            targetDistance *= Math.tan((this.object.fov / 2) * Math.PI / 180.0);

            // we use only clientHeight here so aspect ratio does not distort speed
            this.panLeft(2 * deltaX * targetDistance / element.clientHeight, this.object.matrix);
            this.panUp(2 * deltaY * targetDistance / element.clientHeight, this.object.matrix);
        } else if (this.object.isOrthographicCamera) {
            // orthographic
            this.panLeft(deltaX * (this.object.right - this.object.left) / this.object.zoom / element.clientWidth, this.object.matrix);
            this.panUp(deltaY * (this.object.top - this.object.bottom) / this.object.zoom / element.clientHeight, this.object.matrix);
        } else {
            // camera neither orthographic nor perspective
            console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
            this.enablePan = false;
        }
    }

    dollyOut(dollyScale) {
        if (this.object.isPerspectiveCamera) {
            this.scale /= dollyScale;
        } else if (this.object.isOrthographicCamera) {
            this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom * dollyScale));
            this.object.updateProjectionMatrix();
            this.zoomChanged = true;
        } else {
            console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
            this.enableZoom = false;
        }
    }

    dollyIn(dollyScale) {
        if (this.object.isPerspectiveCamera) {
            this.scale *= dollyScale;
        } else if (this.object.isOrthographicCamera) {
            this.object.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.object.zoom / dollyScale));
            this.object.updateProjectionMatrix();
            this.zoomChanged = true;
        } else {
            console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
            this.enableZoom = false;
        }
    }

    // 

    //
    // event callbacks - update the object state
    //

    handleMouseDownRotate(event) {
        this.rotateStart.set(event.clientX, event.clientY);

    }

    handleMouseDownDolly(event) {
        this.dollyStart.set(event.clientX, event.clientY);

    }

    handleMouseDownPan(event) {
        this.panStart.set(event.clientX, event.clientY);
    }

    handleMouseMoveRotate(event) {
        this.rotateEnd.set(event.clientX, event.clientY);

        this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(this.rotateSpeed);

        const element = this.element;

        this.rotateLeft(2 * Math.PI * this.rotateDelta.x / element.clientHeight); // yes, height
        this.rotateUp(2 * Math.PI * this.rotateDelta.y / element.clientHeight);

        this.rotateStart.copy(this.rotateEnd);

        this.update(true);
    }

    handleMouseMoveDolly(event) {
        this.dollyEnd.set(event.clientX, event.clientY);
        this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);

        if (this.dollyDelta.y > 0) {
            this.dollyOut(this.getZoomScale());
        } else if (this.dollyDelta.y < 0) {
            this.dollyIn(this.getZoomScale());
        }
        this.dollyStart.copy(this.dollyEnd);
        this.update(true);
    }

    handleMouseMovePan(event) {
        this.panEnd.set(event.clientX, event.clientY);
        this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(this.panSpeed);
        this.pan(this.panDelta.x, this.panDelta.y);

        this.panStart.copy(this.panEnd);

        this.update(true);
    }

    handleMouseUp( /*event*/) {
        // no-op
    }

    handleMouseWheel(event) {
        if (event.deltaY < 0) {
            this.dollyIn(this.getZoomScale());
        } else if (event.deltaY > 0) {
            this.dollyOut(this.getZoomScale());
        }

        this.update(true);
    }

    // -- HANDLERS --

    // Called when the cursor location has moved
    onPointerMove = (event) => {
        if (!this.enabled || (this.state == STATE.NONE)) return;

        switch (event.pointerType) {
            case 'mouse':
            case 'pen':
                this.onMouseMove(event);
                break;
            // TODO touch
        }
    }

    // Called when the cursor is no longer behind held
    onPointerUp = (event) => {
        if (!this.enabled) return;
        switch (event.pointerType) {
            case 'mouse':
            case 'pen':
                this.onMouseUp(event);
                break;
            // TODO touch
        }
    }

    // On left click or tap
    onPointerDown = (event) => {
        if (!this.enabled) return

        switch (event.pointerType) {
            case 'mouse':
            case 'pen':
                this.onMouseDown(event);
                break;
            // TODO touch
        }
    }

    onMouseDown(event) {
        // Prevent the browser from scrolling.
        event.preventDefault();

        // Manually set the focus since calling preventDefault above
        // prevents the browser from setting it automatically.
        this.element.focus ? this.element.focus() : window.focus();

        var mouseAction;

        switch (event.button) {
            case 0:
                mouseAction = this.mouseButtons.LEFT;
                break;
            case 1:
                mouseAction = this.mouseButtons.MIDDLE;
                break;
            case 2:
                mouseAction = this.mouseButtons.RIGHT;
                break;
            default:
                mouseAction = - 1;
        }

        switch (mouseAction) {
            case THREE.MOUSE.DOLLY:
                if (this.enableZoom === false) return;
                this.handleMouseDownDolly(event);
                this.state = STATE.DOLLY;
                break;
            case THREE.MOUSE.ROTATE:
                if (event.ctrlKey || event.metaKey || event.shiftKey) {
                    if (this.enablePan === false) return;
                    this.handleMouseDownPan(event);
                    this.state = STATE.PAN;
                } else {
                    if (this.enableRotate === false) return;
                    this.handleMouseDownRotate(event);
                    this.state = STATE.ROTATE;
                }
                break;
            case THREE.MOUSE.PAN:
                if (event.ctrlKey || event.metaKey || event.shiftKey) {
                    if (this.enableRotate === false) return;
                    this.handleMouseDownRotate(event);
                    this.state = STATE.ROTATE;
                } else {
                    if (this.enablePan === false) return;
                    this.handleMouseDownPan(event);
                    this.state = STATE.PAN;
                }
                break;
            default:
                this.state = STATE.NONE;

        }

        if (this.state !== STATE.NONE) {
            // For simplicity sake, these event handlers are always set
            // this.element.ownerDocument.addEventListener('pointermove', onPointerMove, false);
            // this.element.ownerDocument.addEventListener('pointerup', onPointerUp, false);

            // this.dispatchEvent(startEvent);
        }

    }

    onMouseMove(event) {
        if (this.enabled === false) return;

        event.preventDefault();

        switch (this.state) {
            case STATE.ROTATE:
                if (this.enableRotate === false) return;
                this.handleMouseMoveRotate(event);
                break;
            case STATE.DOLLY:
                if (this.enableZoom === false) return;
                this.handleMouseMoveDolly(event);
                break;
            case STATE.PAN:
                if (this.enablePan === false) return;
                this.handleMouseMovePan(event);
                break;
        }
    }

    onMouseUp(event) {
        this.state = STATE.NONE;
    }

    onMouseWheel = (event) => {
        if (this.enabled === false || this.enableZoom === false || (this.state !== STATE.NONE && this.state !== STATE.ROTATE)) return;
        event.preventDefault();
        event.stopPropagation();
        // this.dispatchEvent(startEvent);
        this.handleMouseWheel(event);
        // this.dispatchEvent(endEvent);
    }

    tickContols = () => {
        let needsUpdate = false;
        const control = this.controlMap;

        for (var keyCode of this.keyDowns) {
            switch (keyCode) {
                case control.MOVE_FORWARD:
                    this.pan(0, this.keyPanSpeed);
                    needsUpdate = true;
                    break;

                case control.MOVE_BACKWARD:
                    this.pan(0, - this.keyPanSpeed);
                    needsUpdate = true;
                    break;

                case control.MOVE_LEFT:
                    this.pan(this.keyPanSpeed, 0);
                    needsUpdate = true;
                    break;

                case control.MOVE_RIGHT:
                    this.pan(-this.keyPanSpeed, 0);
                    needsUpdate = true;
                    break;

                case control.MOVE_UP:
                    this.translateY(+1);
                    needsUpdate = true;
                    break;

                case control.MOVE_DOWN:
                    this.translateY(-1);
                    needsUpdate = true;
                    break;
            }
        }

        if (needsUpdate) {
            // We don't (shouldn't?) need to update here since we already run on update
            // this.update(true)
        }
    }

    onKeyDown = (e) => {
        if (!this.enabled) return;
        
        // console.log('K', e)

        if (!this.keyDowns.includes(e.code)) {
            this.keyDowns.push(e.code);
            console.debug('[control] Downed: ', this.keyDowns);
        }
    }

    onKeyUp = (event) => {
        console.log('KU', event.code, this.keyDowns)
        this.keyDowns = this.keyDowns.filter(code => code != event.code)
        console.log('KU End', event.code, this.keyDowns)
    }

    onContextMenu = (event) => {
        // Disable context menu
        if (this.enabled) event.preventDefault();
    }

    registerHandlers() {
        this.element.ownerDocument.addEventListener('pointermove', this.onPointerMove, false);
        this.element.ownerDocument.addEventListener('pointerup', this.onPointerUp, false);
        this.element.ownerDocument.addEventListener('pointerdown', this.onPointerDown, false);
        this.element.addEventListener('wheel', this.onMouseWheel, true);

        this.element.ownerDocument.addEventListener('contextmenu', this.onContextMenu, false);
        this.element.ownerDocument.addEventListener('keydown', this.onKeyDown, false);
        this.element.ownerDocument.addEventListener('keyup', this.onKeyUp, false);
        console.log('[controls] registered handlers', this.element)
    }

    unregisterHandlers() {
        this.element.removeEventListener('contextmenu', this.onContextMenu, false);

        this.element.removeEventListener('pointerdown', this.onPointerDown, false);
        this.element.removeEventListener('wheel', this.onMouseWheel, false);

        // this.element.removeEventListener( 'touchstart', onTouchStart, false );
        // this.element.removeEventListener( 'touchend', onTouchEnd, false );
        // this.element.removeEventListener( 'touchmove', onTouchMove, false );

        this.element.ownerDocument.removeEventListener('pointermove', this.onPointerMove, false);
        this.element.ownerDocument.removeEventListener('pointerup', this.onPointerUp, false);

        this.element.removeEventListener('keydown', this.onKeyDown, false);
        this.element.removeEventListener('keyup', this.onKeyUp, false);
    }

}
// src/app/viewer/custom/CustomControls
// src/app/viewer/pviewer/...

module.exports = CustomControls;