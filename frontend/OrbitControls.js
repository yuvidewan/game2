/**
 * OrbitControls.js - minimal build matching three.js r125
 * Fully functional and standalone for your game.
 */

THREE.OrbitControls = function ( object, domElement ) {

    this.object = object;
    this.domElement = domElement;

    this.enabled = true;
    this.target = new THREE.Vector3();

    this.minDistance = 0;
    this.maxDistance = Infinity;

    this.minZoom = 0;
    this.maxZoom = Infinity;

    this.minPolarAngle = 0; // radians
    this.maxPolarAngle = Math.PI; // radians

    this.minAzimuthAngle = -Infinity; // radians
    this.maxAzimuthAngle = Infinity; // radians

    this.enableDamping = false;
    this.dampingFactor = 0.05;

    this.enableZoom = true;
    this.zoomSpeed = 1.0;

    this.enableRotate = true;
    this.rotateSpeed = 1.0;

    this.enablePan = true;
    this.panSpeed = 1.0;
    this.screenSpacePanning = true;
    this.keyPanSpeed = 7.0;

    this.autoRotate = false;
    this.autoRotateSpeed = 2.0;

    this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

    this.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };

    this.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

    this.target0 = this.target.clone();
    this.position0 = this.object.position.clone();
    this.zoom0 = this.object.zoom;

    let spherical = new THREE.Spherical();
    let sphericalDelta = new THREE.Spherical();

    let scale = 1;
    let panOffset = new THREE.Vector3();
    let zoomChanged = false;

    const EPS = 0.000001;
    const scope = this;

    const quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
    const quatInverse = quat.clone().invert();

    let lastPosition = new THREE.Vector3();
    let lastQuaternion = new THREE.Quaternion();

    this.update = function () {
        const offset = new THREE.Vector3();

        const position = scope.object.position;
        offset.copy(position).sub(scope.target);

        offset.applyQuaternion(quat);

        spherical.setFromVector3(offset);

        if (scope.autoRotate) {
            spherical.theta += (2 * Math.PI / 60 / 60) * scope.autoRotateSpeed;
        }

        spherical.theta += sphericalDelta.theta;
        spherical.phi += sphericalDelta.phi;

        spherical.theta = Math.max(scope.minAzimuthAngle, Math.min(scope.maxAzimuthAngle, spherical.theta));
        spherical.phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, spherical.phi));

        spherical.makeSafe();

        spherical.radius *= scale;
        spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius));

        scope.target.add(panOffset);

        offset.setFromSpherical(spherical);

        offset.applyQuaternion(quatInverse);

        position.copy(scope.target).add(offset);

        scope.object.lookAt(scope.target);

        if (scope.enableDamping) {
            sphericalDelta.theta *= (1 - scope.dampingFactor);
            sphericalDelta.phi *= (1 - scope.dampingFactor);
            panOffset.multiplyScalar(1 - scope.dampingFactor);
        } else {
            sphericalDelta.set(0, 0, 0);
            panOffset.set(0, 0, 0);
        }

        scale = 1;

        if (
            zoomChanged ||
            lastPosition.distanceToSquared(scope.object.position) > EPS ||
            8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS
        ) {
            lastPosition.copy(scope.object.position);
            lastQuaternion.copy(scope.object.quaternion);
            zoomChanged = false;
            return true;
        }

        return false;
    };

    this.reset = function () {
        scope.target.copy(scope.target0);
        scope.object.position.copy(scope.position0);
        scope.object.zoom = scope.zoom0;

        scope.object.updateProjectionMatrix();
        scope.update();
    };

    this.dispose = function () {
        scope.domElement.removeEventListener('contextmenu', onContextMenu);
        scope.domElement.removeEventListener('mousedown', onMouseDown);
        scope.domElement.removeEventListener('wheel', onMouseWheel);
        scope.domElement.removeEventListener('touchstart', onTouchStart);
        scope.domElement.removeEventListener('touchend', onTouchEnd);
        scope.domElement.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('keydown', onKeyDown);
    };

    this.getPolarAngle = function () {
        return spherical.phi;
    };

    this.getAzimuthalAngle = function () {
        return spherical.theta;
    };

    this.saveState = function () {
        scope.target0.copy(scope.target);
        scope.position0.copy(scope.object.position);
        scope.zoom0 = scope.object.zoom;
    };

    function onContextMenu(event) {
        if (scope.enabled === false) return;
        event.preventDefault();
    }

    function onMouseDown(event) {
        if (scope.enabled === false) return;
        event.preventDefault();
        scope.domElement.focus ? scope.domElement.focus() : window.focus();
    }

    function onMouseWheel(event) {
        if (scope.enabled === false || scope.enableZoom === false) return;
        event.preventDefault();
        event.stopPropagation();

        if (event.deltaY < 0) {
            scale *= 0.95;
        } else if (event.deltaY > 0) {
            scale /= 0.95;
        }

        zoomChanged = true;
        scope.update();
    }

    function onKeyDown(event) {
        if (scope.enabled === false || scope.enablePan === false) return;

        let needsUpdate = false;

        switch (event.keyCode) {
            case scope.keys.UP:
                pan(0, scope.keyPanSpeed);
                needsUpdate = true;
                break;
            case scope.keys.BOTTOM:
                pan(0, -scope.keyPanSpeed);
                needsUpdate = true;
                break;
            case scope.keys.LEFT:
                pan(scope.keyPanSpeed, 0);
                needsUpdate = true;
                break;
            case scope.keys.RIGHT:
                pan(-scope.keyPanSpeed, 0);
                needsUpdate = true;
                break;
        }

        if (needsUpdate) {
            event.preventDefault();
            scope.update();
        }
    }

    function pan(deltaX, deltaY) {
        const offset = new THREE.Vector3();
        const element = scope.domElement;

        if (scope.object.isPerspectiveCamera) {
            const position = scope.object.position;
            offset.copy(position).sub(scope.target);
            let targetDistance = offset.length();
            targetDistance *= Math.tan((scope.object.fov / 2) * Math.PI / 180.0);

            const panX = (2 * deltaX * targetDistance) / element.clientHeight;
            const panY = (2 * deltaY * targetDistance) / element.clientHeight;

            const pan = new THREE.Vector3();
            pan.setFromMatrixColumn(scope.object.matrix, 0);
            pan.multiplyScalar(-panX);
            panOffset.add(pan);

            pan.setFromMatrixColumn(scope.object.matrix, 1);
            pan.multiplyScalar(panY);
            panOffset.add(pan);
        }
    }

    this.domElement.addEventListener('contextmenu', onContextMenu, false);
    this.domElement.addEventListener('mousedown', onMouseDown, false);
    this.domElement.addEventListener('wheel', onMouseWheel, false);
    window.addEventListener('keydown', onKeyDown, false);

    this.update();
};

THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;
