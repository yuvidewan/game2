// === First-Person Endless Runner: Smash Hit Style ===
// Uses: Three.js, webcam gesture backend

const API_URL = "http://localhost:8000";

// --- Globals ---
let scene, camera, renderer, clock;
let corridorSegments = [], obstacles = [], collectibles = [];
let gestureState = {};
let gameState = "start", score = 0, distance = 0, speed = 0.5;
let sounds = {};
let invincible = false;
let invincibleTimeout = null;
let obstaclesDodged = 0;
let berriesCollected = 0;
let gameStartTime = 0;
let highScore = localStorage.getItem("highScore") || 0;
const SEGMENT_LENGTH = 40;
const OBSTACLE_INTERVAL = 18;
const PLAYER_HEIGHT = 2;
const PLAYER_RADIUS = 0.8;
let targetCameraX = 0, targetCameraY = 2;
let cameraSpeed = 0.2, cameraSpeedTarget = 0.2;
const MAX_AHEAD_SEGMENTS = 6;
const SEGMENT_AHEAD_DISTANCE = SEGMENT_LENGTH * MAX_AHEAD_SEGMENTS;
const gameOverDiv = document.getElementById("game-over");

// --- UI Elements ---
const canvas = document.getElementById("game-canvas");
const statusDiv = document.getElementById("status");
const scoreDiv = document.getElementById("score");
const tutorialDiv = document.getElementById("tutorial");

// Create ground plane once
let jungleGround;

// Initialize on window load
window.onload = () => {
    init();
    document.addEventListener("keydown", startGameListener);
};

function startGameListener(e) {
    if (gameState === "start" && e.code === "Space") {
        startGame();
    }
}

function init() {
    scene = new THREE.Scene();
    clock = new THREE.Clock();
    scene.background = new THREE.TextureLoader().load("images/bg_img.png");

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, PLAYER_HEIGHT, 0);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;
    renderer.outputEncoding = THREE.sRGBEncoding;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbe0, 1.1);
    sunLight.position.set(20, 40, 10);
    scene.add(sunLight);

    for (let i = 0; i < 3; i++) {
        const sunbeam = new THREE.PointLight(0xfffbe0, 0.5, 60);
        sunbeam.position.set(i % 2 === 0 ? -3 : 3, 8, -i * 60);
        scene.add(sunbeam);
    }

    sounds.hit = new Audio("https://cdn.pixabay.com/audio/2022/03/15/audio_115b9bfae2.mp3");
    sounds.collect = new Audio("https://cdn.pixabay.com/audio/2022/03/15/audio_115b9bfae2.mp3");
    sounds.bg = new Audio("audio/bg_music.mp3");
    sounds.bg.loop = true;
    sounds.bg.volume = 0.6;

    if (jungleGround) scene.remove(jungleGround);
    jungleGround = new THREE.Mesh(
        new THREE.BoxGeometry(20, 0.3, 1000),
        new THREE.MeshStandardMaterial({ color: 0x3fa34d, roughness: 0.7, metalness: 0.1 })
    );
    jungleGround.position.set(0, -0.15, -500);
    scene.add(jungleGround);

    resetGame();
    startWebcamCapture();
    animate();
    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function resetGame() {
    for (let i = scene.children.length - 1; i >= 0; i--) {
        const child = scene.children[i];
        if (!(child instanceof THREE.Light) && !(child instanceof THREE.Fog)) {
            scene.remove(child);
        }
    }

    corridorSegments = [];
    obstacles = [];
    collectibles = [];
    score = 0;
    distance = 0;
    speed = 0.5;
    camera.position.set(0, PLAYER_HEIGHT, 0);
    gameState = "start";
    scoreDiv.textContent = "Distance: 0m";
    obstaclesDodged = 0;
    berriesCollected = 0;
    gameStartTime = performance.now();

    document.getElementById("game-info").style.display = "block";

    for (let i = 0; i < MAX_AHEAD_SEGMENTS; i++) {
        const z = -i * SEGMENT_LENGTH;
        addCorridorSegment(z);
        addObstacle(-OBSTACLE_INTERVAL - i * OBSTACLE_INTERVAL);
    }
}



function startGame() {
    gameState = "play";
    const infoBox = document.getElementById("game-info");
    if (infoBox) infoBox.style.display = "none";
    sounds.bg.play();
}

function restartGame() {
    sounds.bg.pause();
    sounds.bg.currentTime = 0;
    sounds.bg.volume = 0.6;
    hideGameOver(); 
    resetGame();
    startGame();
}

function addCorridorSegment(z) {
    const path = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.04, SEGMENT_LENGTH),
        new THREE.MeshStandardMaterial({ color: 0x7c5c36, roughness: 0.8 })
    );
    path.position.set(0, 0.04, z - SEGMENT_LENGTH / 2);
    scene.add(path);
    corridorSegments.push(path);

    for (let i = 0; i < 4; i++) {
        const tuft = new THREE.Mesh(
            new THREE.SphereGeometry(0.18 + Math.random() * 0.08, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x355e2c, roughness: 0.8 })
        );
        tuft.position.set(-2.5 + Math.random() * 5, 0.13, z - SEGMENT_LENGTH / 2 + Math.random() * SEGMENT_LENGTH);
        scene.add(tuft);
        corridorSegments.push(tuft);
    }
}
function addObstacle(z) {
    if (distance < 50 && Math.random() < 0.6) return;

    const laneX = [-2, 0, 2][Math.floor(Math.random() * 3)];
    const isBoulder = Math.random() < 0.5;
    let obstacleMesh;

    if (isBoulder) {
        obstacleMesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.2, 1),
            new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.85, metalness: 0.1 })
        );
        const moss = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x3fa34d, roughness: 0.7 })
        );
        moss.position.set(0.5, 0.5, 0);
        obstacleMesh.add(moss);
    } else {
        obstacleMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.42, 3, 16),
            new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.7, metalness: 0.2 })
        );
        obstacleMesh.rotation.z = Math.PI / 2;

        const capMaterial = new THREE.MeshStandardMaterial({ color: 0xf4d9a4, roughness: 0.5 });
        const capGeo = new THREE.CircleGeometry(0.42, 16);
        [1.5, -1.5].forEach((x, i) => {
            const cap = new THREE.Mesh(capGeo, capMaterial);
            cap.rotation.y = i === 0 ? Math.PI / 2 : -Math.PI / 2;
            cap.position.x = x;
            obstacleMesh.add(cap);
        });

        const moss = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0x355e2c, roughness: 0.7 })
        );
        moss.position.set(0, 0.45, 0);
        obstacleMesh.add(moss);
    }

    obstacleMesh.position.set(laneX, 1.05, z);
    scene.add(obstacleMesh);
    obstacles.push({ obj: obstacleMesh, type: isBoulder ? "boulder" : "log" });

    if (distance > 30 && Math.random() < 0.4) {
        const berryGeometry = new THREE.SphereGeometry(0.33, 24, 24);
        const berryMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b1a1a,           // Deep jungle berry red
            roughness: 0.4,
            metalness: 0.2,
            emissive: 0x3b0a0a,
            emissiveIntensity: 0.5,
            bumpScale: 0.05
        });
        berryMaterial.emissiveIntensity = 0.8;
        berryMaterial.emissive = new THREE.Color(0x3b0a0a);

        const berry = new THREE.Mesh(berryGeometry, berryMaterial);
        berry.scale.set(1, 1.3, 1); // Make it slightly oval

        // Leaf crown
        const leafGeometry = new THREE.ConeGeometry(0.2, 0.25, 8);
        const leafMaterial = new THREE.MeshStandardMaterial({
            color: 0x355e2c,
            roughness: 0.7,
        });
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.rotation.x = Math.PI;
        leaf.position.y = 0.45;
        berry.add(leaf);

        const berryX = [-2, 0, 2].filter(x => x !== laneX)[Math.floor(Math.random() * 2)];
        berry.position.set(berryX, 1.05, z - 4);
        scene.add(berry);
        collectibles.push({ mesh: berry, type: "slow" });
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (gameState === "play") {
        cameraSpeedTarget = 0.2 + Math.min(0.7, distance / 1000);
        cameraSpeed += (cameraSpeedTarget - cameraSpeed) * 0.005;

        camera.position.z -= cameraSpeed;
        distance += cameraSpeed;
        score = Math.floor(distance) + collectibles.filter(c => !c.mesh.visible).length * 10;
        scoreDiv.textContent = `Distance: ${Math.floor(distance)}m`;
        document.getElementById("high-score").textContent = `High Score: ${highScore}m`;

        const hx = Math.max(-1, Math.min(1, gestureState.head_x || 0));
        const hy = Math.max(-1, Math.min(1, gestureState.head_y || 0));
        targetCameraX = -hx * 3.5;
        targetCameraY = PLAYER_HEIGHT + hy * 2.8;

        camera.position.x += (targetCameraX - camera.position.x) * 0.15;
        camera.position.y += (targetCameraY - camera.position.y) * 0.15;

        camera.position.x = Math.max(-2.5, Math.min(2.5, camera.position.x));
        camera.position.y = Math.max(0.5, Math.min(3.5, camera.position.y));
        // === Player boundary timeout ===
        const outX = camera.position.x < -2.3 || camera.position.x > 2.3;
        const outY = camera.position.y < 0.6 || camera.position.y > 3.4;

        if (outX || outY) {
            if (!camera.outTimerStart) {
                camera.outTimerStart = performance.now();
            } else if (performance.now() - camera.outTimerStart > 2500) {
                if (!invincible) {
                    // gameState = "over";
                    // sounds.hit.play();
                    // if (sounds.bg) sounds.bg.volume = 0.1;
                    endGame();
                }
            }
            statusDiv.textContent = "⚠ Keep your head centered!";
            statusDiv.style.opacity = "1";
        } else {
            camera.outTimerStart = null;
            statusDiv.textContent = ""; // Clear the warning 
            statusDiv.style.opacity = "0";
        }
        camera.lookAt(camera.position.x, camera.position.y, camera.position.z - 10);

        let furthestZ = corridorSegments.length ? corridorSegments[corridorSegments.length - 1].position.z : 0;
        while (furthestZ > camera.position.z - SEGMENT_AHEAD_DISTANCE) {
            furthestZ -= SEGMENT_LENGTH;
            addCorridorSegment(furthestZ);
            addObstacle(furthestZ + Math.random() * -OBSTACLE_INTERVAL);
        }

        corridorSegments = corridorSegments.filter(obj => {
            if (obj.position.z > camera.position.z + 30) {
                scene.remove(obj);
                return false;
            }
            return true;
        });

        [obstacles, collectibles].forEach(arr => {
            for (let i = arr.length - 1; i >= 0; i--) {
                const o = arr[i];
                if (o.obj?.position?.z > camera.position.z + 30 || o.mesh?.position?.z > camera.position.z + 30) {
                    scene.remove(o.obj || o.mesh);
                    arr.splice(i, 1);
                }
            }
        });

        checkObstacleCollisions();
        checkCollectibles();
    }

    renderer.render(scene, camera);
}

function checkObstacleCollisions() {
    for (const o of obstacles) {
        const obj = o.obj;
        const dx = camera.position.x - obj.position.x;
        const dy = camera.position.y - obj.position.y;
        const dz = camera.position.z - obj.position.z;

    if (Math.abs(dx) < PLAYER_RADIUS + 0.7 &&
        Math.abs(dy) < PLAYER_RADIUS + 0.7 &&
        Math.abs(dz) < PLAYER_RADIUS + 0.7) {
        if (!invincible) {
            endGame();
            break;
        } else {
            continue;
        }
    } else if (obj.position.z > camera.position.z + 5 && !o.counted) {
        o.counted = true;
        obstaclesDodged++;
    }
}}

function checkCollectibles() {
    for (const c of collectibles) {
        if (!c.mesh.visible) continue;

        const dx = camera.position.x - c.mesh.position.x;
        const dy = camera.position.y - c.mesh.position.y;
        const dz = camera.position.z - c.mesh.position.z;

        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < PLAYER_RADIUS + 0.5) {
            c.mesh.visible = false;
            sounds.collect.play();
            berriesCollected++;
            if (c.type === "slow") activateInvincibleEffect();
        }
    }
}

function activateInvincibleEffect() {
    if (invincibleTimeout) clearTimeout(invincibleTimeout);
    invincible = true;
    showInvincibleOverlay();
    invincibleTimeout = setTimeout(() => {
        invincible = false;
        hideInvincibleOverlay();
    }, 5000);
}


function showInvincibleOverlay() {
    const overlay = document.getElementById("overlay");
    overlay.style.display = "flex";
    overlay.style.background = "rgba(255, 215, 0, 0.3)";
    overlay.style.color = "#000";
    overlay.textContent = "";   //Jungle Berry Power! You Are Invincible!
}

function hideInvincibleOverlay() {
    const overlay = document.getElementById("overlay");
    overlay.style.display = "none";
    overlay.textContent = "";
}

function startWebcamCapture() {
    const video = document.getElementById("webcam");
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            setInterval(() => captureFrame(video), 300);
        };
    }).catch(err => {
        console.error("Webcam error:", err);
        statusDiv.textContent = "Webcam access denied. Head tracking disabled.";
    });
}

function captureFrame(video) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    tempCanvas.getContext("2d").drawImage(video, 0, 0);
    tempCanvas.toBlob(blob => sendToBackend(blob), "image/jpeg");
}

function sendToBackend(blob) {
    const formData = new FormData();
    formData.append("file", blob, "frame.jpg");

    fetch(`${API_URL}/detect-gesture/`, {
        method: "POST",
        body: formData
    }).then(res => res.json()).then(data => {
        gestureState = data.gestures;
    }).catch(err => {
        console.error("Gesture API error:", err);
    });
}

function endGame() {
    gameState = "over";
    sounds.hit.play();
    if (sounds.bg) sounds.bg.volume = 0.1;

    if (distance > highScore) {
        highScore = Math.floor(distance);
        localStorage.setItem("highScore", highScore);
        console.log("New High Score!", highScore);
    }

    showEndStats();
}


function showGameOver() {
    if (gameOverDiv) {
        gameOverDiv.style.display = "block";
    }
}

function hideGameOver() {
    if (gameOverDiv) {
        gameOverDiv.style.display = "none";
    }
}

function showEndStats() {
    const endStats = document.getElementById("end-stats");
    const distanceEl = document.getElementById("stat-distance");
    const obstaclesEl = document.getElementById("stat-obstacles");
    const berriesEl = document.getElementById("stat-berries");
    const timeEl = document.getElementById("stat-time");
    const highScoreEl = document.getElementById("stat-high-score");

    const totalTime = ((performance.now() - gameStartTime) / 1000).toFixed(1);

    animateCounter(distanceEl, 0, Math.floor(distance), 500);
    animateCounter(obstaclesEl, 0, obstaclesDodged, 500);
    animateCounter(berriesEl, 0, berriesCollected, 500);
    animateCounter(timeEl, 0, totalTime, 500);

    highScoreEl.textContent = highScore;

    endStats.style.display = "block";
}


function animateCounter(el, from, to, duration) {
    const start = performance.now();
    function step(timestamp) {
        const progress = Math.min((timestamp - start) / duration, 1);
        const value = from + (to - from) * progress;
        el.textContent = Math.floor(value);
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }
    requestAnimationFrame(step);
}

document.getElementById("restart-btn").addEventListener("click", () => {
    document.getElementById("end-stats").style.display = "none";
    restartGame();
});


