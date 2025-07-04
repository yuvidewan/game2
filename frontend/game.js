const API_URL = 'http://localhost:8000';

let levelNum = 0;
let levelData = null;
let obstacles = [];
let player = { x: 0, y: 0, z: 0, mesh: null, state: 'idle', gadgetCooldown: 0 };
let score = 0;
let gameActive = false;
let gestureState = getDefaultGestures();
let obstacleIndex = 0;
let scene, camera, renderer, controls, ambientLight, spotLight;
let obstacleMeshes = [];
let animating = false;
let backgroundMusic;

const canvas = document.getElementById('three-canvas');
const statusDiv = document.getElementById('status');
const levelDiv = document.getElementById('level');
const scoreDiv = document.getElementById('score');
const tutorialDiv = document.getElementById('tutorial');
const loadingDiv = document.getElementById('loading');

// function playMusic() {
//     backgroundMusic = new Audio('music/background.mp3');
//     backgroundMusic.loop = true;
//     backgroundMusic.volume = 0.3;
//     backgroundMusic.play().catch(() => {
//         console.warn("Background music failed to play automatically.");
//     });
// }

function showLoading(show) {
    loadingDiv.style.display = show ? 'flex' : 'none';
}

function showTutorial(controls, tips) {
    tutorialDiv.innerHTML = `<h2>How to Play</h2><ul>${controls.map(c => `<li><b>${c.gesture}</b>: ${c.action}</li>`).join('')}</ul><h3>Tips</h3><ul>${tips.map(t => `<li>${t}</li>`).join('')}</ul><button id='closeTutorial'>Start Heist!</button>`;
    tutorialDiv.style.display = 'block';
    document.getElementById('closeTutorial').onclick = () => {
        tutorialDiv.style.display = 'none';
        startGame();
    };
}

async function fetchTutorial() {
    try {
        const res = await fetch(`${API_URL}/tutorial`);
        const data = await res.json();
        showTutorial(data.controls, data.tips);
    } catch (err) {
        console.error("Failed to fetch tutorial:", err);
        showTutorial([
            { gesture: "Head Left/Right", action: "Move left/right" },
            { gesture: "Mouth Open", action: "Jump over lasers" },
            { gesture: "Eyebrow Raise", action: "Freeze to avoid cameras" },
            { gesture: "Blink", action: "Use EMP gadget (disable guard)" }
        ], ["Stay alert!", "Timing is everything."]);
    }
}

async function fetchLevel(num) {
    const res = await fetch(`${API_URL}/level/${num}`);
    const data = await res.json();
    levelData = data.level;
    obstacles = data.obstacles;
    obstacleIndex = 0;
    levelDiv.textContent = `Level ${levelNum + 1}: ${levelData.name}`;
    scoreDiv.textContent = `Score: ${score}`;
}

function setupThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x181818);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 8, 24);
    camera.lookAt(new THREE.Vector3(0, 3, 12));

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.target.set(0, 3, 12);
    controls.update();

    ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(0, 20, 10);
    spotLight.castShadow = true;
    scene.add(spotLight);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

function createRoom() {
    const floor = new THREE.Mesh(
        new THREE.BoxGeometry(20, 0.5, 30),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    floor.receiveShadow = true;
    scene.add(floor);

    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x222233 });
    const walls = [
        [0, 4, -15], [0, 4, 15], [-10, 4, 0], [10, 4, 0]
    ];

    walls.forEach(pos => {
        const geo = pos[0] === 0
            ? new THREE.BoxGeometry(20, 8, 0.5)
            : new THREE.BoxGeometry(0.5, 8, 30);
        const wall = new THREE.Mesh(geo, wallMaterial);
        wall.position.set(...pos);
        scene.add(wall);
    });
}

function createPlayer() {
    const group = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.9, 2.5, 16),
        new THREE.MeshStandardMaterial({ color: 0xFFD700 })
    );
    body.position.y = 2.2;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xFFF2CC })
    );
    head.position.y = 3.7;
    head.castShadow = true;
    group.add(head);

    group.position.set(0, 0, 12);
    scene.add(group);
    player.mesh = group;
}

function renderObstacles() {
    obstacleMeshes.forEach(m => scene.remove(m));
    obstacleMeshes = [];

    for (let i = obstacleIndex; i < obstacleIndex + 3 && i < obstacles.length; i++) {
        const z = 12 + (i - obstacleIndex) * 6;
        const type = obstacles[i];
        let mesh;

        if (type === 'laser') {
            mesh = new THREE.Mesh(
                new THREE.CylinderGeometry(0.1, 0.1, 18),
                new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x880000 })
            );
            mesh.position.set(0, 1.2, z);
        } else if (type === 'camera') {
            mesh = new THREE.Mesh(
                new THREE.BoxGeometry(1.2, 0.7, 1.2),
                new THREE.MeshStandardMaterial({ color: 0x00BFFF })
            );
            mesh.position.set(6, 5.5, z);
        } else if (type === 'guard') {
            mesh = new THREE.Mesh(
                new THREE.CylinderGeometry(0.7, 0.7, 2.5, 16),
                new THREE.MeshStandardMaterial({ color: 0x333333 })
            );
            mesh.position.set(-6, 1.5, z);
        } else if (type === 'trapdoor') {
            mesh = new THREE.Mesh(
                new THREE.BoxGeometry(3, 0.2, 2),
                new THREE.MeshStandardMaterial({ color: 0x654321 })
            );
            mesh.position.set(0, 0.3, z);
        }

        if (mesh) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            scene.add(mesh);
            obstacleMeshes.push(mesh);
        }
    }
}

function animatePlayer(action) {
    if (!player.mesh || animating) return;
    animating = true;

    const start = player.mesh.position.clone();
    const target = start.clone();

    if (action === 'jump') target.y += 2.5;
    if (action === 'move') {
    target.z += 1;
}
    if (action === 'move_left') target.x -= 2.5;
    if (action === 'move_right') target.x += 2.5;
    if (action === 'gadget') {
        renderer.setClearColor(0x00ffff);
        setTimeout(() => renderer.setClearColor(0x181818), 300);
    }

    let step = 0;

    function stepAnim() {
        step++;
        const t = step / 20;
        player.mesh.position.lerpVectors(start, target, t);

        if (step < 20) {
            requestAnimationFrame(stepAnim);
        } else {
            if (action === 'jump') player.mesh.position.y = 0;
            animating = false;
        }
    }

    stepAnim();
}

function getPlayerAction(g) {
    // Map gestures to actions exactly per README
    if (g.blink && player.gadgetCooldown === 0) return 'gadget';
    if (g.eyebrow_raise) return 'freeze';
    if (g.mouth_open) return 'jump';
    if (g.head_direction === 'left') return 'move_left';
    if (g.head_direction === 'right') return 'move_right';
    return 'move';
}

function updateGame() {
    if (!gameActive) return;

    const action = getPlayerAction(gestureState);
    if (['move_left', 'move_right'].includes(action)) {
        player.x += (action === 'move_left' ? -2.5 : 2.5);
        player.x = Math.max(-7, Math.min(7, player.x));
    }
    if (player.mesh) {
    player.mesh.position.x = player.x;
}


    if (player.gadgetCooldown > 0) player.gadgetCooldown--;

    const obsType = obstacles[obstacleIndex];
    let collision = true;

    if (obsType === 'laser' && action === 'jump') {
        animatePlayer('jump');
        collision = false;
    } else if (obsType === 'camera' && action === 'freeze') {
        collision = false;
    } else if (obsType === 'guard' && action === 'gadget' && player.gadgetCooldown === 0) {
        player.gadgetCooldown = 40;
        animatePlayer('gadget');
        collision = false;
    } else if (obsType === 'trapdoor' && ['move_left', 'move_right'].includes(action)) {
        animatePlayer(action);
        collision = false;
    } else if (action === 'move') {
        animatePlayer('move');
        collision = false;
    }

    if (!collision) {
        obstacleIndex++;
        score += 10;
        renderObstacles();
        statusDiv.textContent = '✅ Passed';
    } else {
        gameActive = false;
        flashScreen();
        statusDiv.textContent = `💥 Game Over! Final Score: ${score}`;
    }

    scoreDiv.textContent = `Score: ${score}`;

    if (obstacleIndex >= obstacles.length) {
        gameActive = false;
        statusDiv.textContent = '🎉 Level Complete!';
        setTimeout(() => {
            levelNum++;
            startGame();
        }, 1500);
    }
}

function flashScreen() {
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100vw';
    flash.style.height = '100vh';
    flash.style.background = 'rgba(255,0,0,0.4)';
    flash.style.zIndex = '5000';
    document.body.appendChild(flash);
    setTimeout(() => document.body.removeChild(flash), 300);
}

async function sendFrameToBackend(blob) {
    const formData = new FormData();
    formData.append('file', blob, 'frame.jpg');

    try {
        const res = await fetch(`${API_URL}/detect-gesture/`, { method: 'POST', body: formData });

        if (!res.ok) {
            console.warn('⚠️ Backend error status:', res.status);
            gestureState = getDefaultGestures();
            return;
        }

        const data = await res.json();
        if (data && data.gestures) {
            gestureState = data.gestures;
        } else {
            gestureState = getDefaultGestures();
        }

        console.log('[GestureState]', gestureState);

    } catch (err) {
        console.error('⚠️ Error sending frame to backend:', err);
        gestureState = getDefaultGestures();
    }
}

function startWebcam() {
    const webcam = document.getElementById('webcam');

    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        webcam.srcObject = stream;
        webcam.onloadedmetadata = () => {
            setInterval(() => {
                if (!gameActive) return;

                const offscreen = document.createElement('canvas');
                offscreen.width = webcam.videoWidth;
                offscreen.height = webcam.videoHeight;
                offscreen.getContext('2d').drawImage(webcam, 0, 0);
                offscreen.toBlob(sendFrameToBackend, 'image/jpeg');
            }, 200);
        };
    }).catch(() => {
        statusDiv.textContent = '❌ Webcam access denied.';
    });
}

async function startGame() {
    showLoading(true);
    await fetchLevel(levelNum);
    if (!scene) {
        setupThree();
        createRoom();
        createPlayer();
    } else {
        player.mesh.position.set(0, 0, 12);
        player.x = 0;
        clearObstacles();
    }
    renderObstacles();
    score = 0;
    gameActive = true;
    statusDiv.textContent = '🎮 Heist started!';
    showLoading(false);
    document.getElementById('loading').style.display = 'none';
    gameLoop();
    // if (!backgroundMusic) playMusic();
}

window.onload = () => {
    showLoading(true);
    fetchTutorial().catch(() => {
        console.warn('Tutorial fetch failed, starting game anyway.');
        startGame();
    });
    startWebcam();
};


// ✅ NEW UTILS
function clearObstacles() {
    obstacleMeshes.forEach(mesh => scene.remove(mesh));
    obstacleMeshes = [];
}

function gameLoop() {
    requestAnimationFrame(gameLoop);
    updateGame();
    controls.update();
    renderer.render(scene, camera);
}


function getDefaultGestures() {
    return {
        mouth_open: false,
        eyebrow_raise: false,
        blink: false,
        head_direction: 'center'
    };
}

// Optional for testing without backend
// function getRandomGestures() {
//     return {
//         mouth_open: Math.random() < 0.3,
//         eyebrow_raise: Math.random() < 0.3,
//         blink: Math.random() < 0.2,
//         head_direction: ['center', 'left', 'right'][Math.floor(Math.random() * 3)]
//     };
// }
