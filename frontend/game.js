// === First-Person Endless Runner: Smash Hit Style ===
// Uses: Three.js, GLTFLoader, webcam gesture backend
// Player moves forward in a corridor, dodges obstacles with head gestures

const API_URL = "http://localhost:8000";

// --- Globals ---
let scene, camera, renderer, clock;
let corridorSegments = [], obstacles = [], collectibles = [];
let gestureState = {};
let gameState = "start", score = 0, distance = 0, speed = 0.5;
let sounds = {};
const SEGMENT_LENGTH = 40;
const OBSTACLE_INTERVAL = 18;
const PLAYER_HEIGHT = 2;
const PLAYER_RADIUS = 0.8;
let targetCameraX = 0, targetCameraY = 2;
let cameraSpeed = 0.2; // Start slow
let cameraSpeedTarget = 0.2;
const MAX_AHEAD_SEGMENTS = 4;
const SEGMENT_AHEAD_DISTANCE = SEGMENT_LENGTH * MAX_AHEAD_SEGMENTS;

// --- UI Elements ---
const canvas = document.getElementById("game-canvas");
const statusDiv = document.getElementById("status");
const levelDiv = document.getElementById("level");
const scoreDiv = document.getElementById("score");
const tutorialDiv = document.getElementById("tutorial");

init();

document.addEventListener("keydown", startGameListener);

function startGameListener(e) {
  if (gameState === "start" && e.code === "Space") {
    startGame();
  }
  if (gameState === "over" && e.code === "Space") {
    restartGame();
  }
}

function init() {
  scene = new THREE.Scene();
  clock = new THREE.Clock();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, PLAYER_HEIGHT, 0);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.setClearColor(0xf4f6fa); // Force light background

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
  scene.add(dirLight);

  sounds.hit = new Audio("https://cdn.pixabay.com/audio/2022/03/15/audio_115b9bfae2.mp3");
  sounds.collect = new Audio("https://cdn.pixabay.com/audio/2022/03/15/audio_115b9bfae2.mp3");

  fetch(`${API_URL}/tutorial`).then(res => res.json()).then(data => {
    tutorialDiv.innerHTML = `<b>Controls:</b><ul>${data.controls.map(c => `<li>${c.gesture}: ${c.action}</li>`).join("")}</ul><b>Tips:</b> ${data.tips.join(", ")}`;
  });

  resetGame();
  startWebcamCapture();
  animate();
}

function resetGame() {
  // Remove all objects except lights
  for (let i = scene.children.length - 1; i >= 0; i--) {
    if (!(scene.children[i] instanceof THREE.Light)) scene.remove(scene.children[i]);
  }
  corridorSegments = [];
  obstacles = [];
  collectibles = [];
  score = 0;
  distance = 0;
  speed = 0.5;
  camera.position.set(0, PLAYER_HEIGHT, 0);
  gameState = "start";
  levelDiv.textContent = "POV RUNNER";
  scoreDiv.textContent = `Score: 0 | Distance: 0m`;
  statusDiv.textContent = "Press Space or Blink to Start!";
  // Initial corridor
  const loader = new THREE.GLTFLoader();
  for (let i = 0; i < 4; i++) {
    addCorridorSegment(loader, -i * SEGMENT_LENGTH);
  }
  for (let i = 0; i < 3; i++) {
    addObstacle(loader, -OBSTACLE_INTERVAL - i * OBSTACLE_INTERVAL);
  }
}

function startGame() {
  gameState = "play";
  statusDiv.textContent = "Go!";
}

function restartGame() {
  resetGame();
  startGame();
}

function addCorridorSegment(loader, z) {
  loader.load("assets/models/museum.glb", gltf => {
    let segment = gltf.scene;
    // Remove background/environment meshes if present
    segment.traverse(child => {
      if (child.isMesh && (child.name.toLowerCase().includes("background") || child.name.toLowerCase().includes("sky"))) {
        segment.remove(child);
      }
    });
    segment.scale.set(4, 4, SEGMENT_LENGTH / 10);
    segment.position.set(0, 0, z - SEGMENT_LENGTH / 2);
    scene.add(segment);
    scene.environment = null; // Remove any environment map
    corridorSegments.push(segment);
  });
}

function addObstacle(loader, z) {
  // Randomly choose obstacle type: laser or guard
  if (Math.random() > 0.5) {
    loader.load("assets/models/laser.glb", gltf => {
      let laser = gltf.scene;
      laser.position.set(-4 + Math.floor(Math.random() * 3) * 4, 1, z);
      laser.castShadow = true;
      scene.add(laser);
      obstacles.push({ obj: laser, type: "laser" });
    });
  } else {
    loader.load("assets/models/guard.glb", gltf => {
      let guard = gltf.scene;
      guard.position.set(-4 + Math.floor(Math.random() * 3) * 4, 0, z);
      guard.castShadow = true;
      scene.add(guard);
      obstacles.push({ obj: guard, type: "guard" });
    });
  }
  // Add collectibles
  let coin = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffd700 })
  );
  coin.position.set(-3 + Math.random() * 6, 1, z - 4);
  coin.castShadow = true;
  scene.add(coin);
  collectibles.push(coin);
}

function animate() {
  requestAnimationFrame(animate);
  if (gameState === "play") {
    // --- Camera Speed Logic ---
    cameraSpeedTarget = 0.2 + Math.min(1.2, distance / 400); // gentle ramp-up
    cameraSpeed += (cameraSpeedTarget - cameraSpeed) * 0.01; // smooth speed change
    let moveVec = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    camera.position.z += moveVec.z * cameraSpeed;
    distance += cameraSpeed;
    score = Math.floor(distance) + collectibles.filter(c => !c.visible).length * 10;
    scoreDiv.textContent = `Score: ${score} | Distance: ${Math.floor(distance)}m`;
    // --- Head Tracking: Clamp, round, smooth ---
    let hx = Math.max(-1, Math.min(1, +(gestureState.head_x || 0).toFixed(3)));
    let hy = Math.max(-1, Math.min(1, +(gestureState.head_y || 0).toFixed(3)));
    targetCameraX = hx * 6;
    targetCameraY = 2 + hy * 2;
    // Higher smoothing factor for less lag
    camera.position.x += (targetCameraX - camera.position.x) * 0.28;
    camera.position.y += (targetCameraY - camera.position.y) * 0.28;
    camera.lookAt(camera.position.x, camera.position.y, camera.position.z - 10);
    // --- Procedural Generation: Always keep segments/obstacles ahead ---
    const loader = new THREE.GLTFLoader();
    let furthestZ = corridorSegments.length ? corridorSegments[corridorSegments.length - 1].position.z : 0;
    while (camera.position.z < furthestZ - SEGMENT_AHEAD_DISTANCE + SEGMENT_LENGTH) {
      addCorridorSegment(loader, furthestZ - SEGMENT_LENGTH);
      addObstacle(loader, furthestZ - OBSTACLE_INTERVAL);
      furthestZ -= SEGMENT_LENGTH;
    }
    // --- Cleanup: Remove objects far behind ---
    while (corridorSegments.length && corridorSegments[0].position.z > camera.position.z + 30) {
      scene.remove(corridorSegments[0]);
      corridorSegments.shift();
    }
    obstacles = obstacles.filter(obj => {
      if (obj.obj.position.z > camera.position.z + 30) {
        scene.remove(obj.obj);
        return false;
      }
      return true;
    });
    collectibles = collectibles.filter(coin => {
      if (coin.position.z > camera.position.z + 30) {
        scene.remove(coin);
        return false;
      }
      return true;
    });
    // --- Collisions ---
    checkObstacleCollisions();
    checkCollectibles();
  }
  if (gameState === "over") {
    statusDiv.textContent = "Game Over! Press Space to Restart.";
  }
  renderer.render(scene, camera);
}

function checkObstacleCollisions() {
  for (let i = 0; i < obstacles.length; i++) {
    let obs = obstacles[i];
    let pos = obs.obj.position;
    let dx = camera.position.x - pos.x;
    let dy = camera.position.y - (pos.y || PLAYER_HEIGHT);
    let dz = camera.position.z - pos.z;
    let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (Math.abs(dz) < 1.5 && Math.abs(dx) < 1.2 && Math.abs(dy) < 1.2) {
      // Collision!
      sounds.hit.play();
      gameState = "over";
      break;
    }
  }
}

function checkCollectibles() {
  collectibles.forEach((coin, idx) => {
    if (coin && coin.visible && Math.abs(camera.position.z - coin.position.z) < 1.2 && Math.abs(camera.position.x - coin.position.x) < 1.2 && Math.abs(camera.position.y - coin.position.y) < 1.2) {
      coin.visible = false;
      sounds.collect.play();
      score += 10;
    }
  });
}

function startWebcamCapture() {
  const video = document.getElementById("webcam");
  navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      setInterval(() => captureFrame(video), 300);
    };
  });
}
function captureFrame(video) {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0);
  canvas.toBlob(blob => sendToBackend(blob), "image/jpeg");
}
function sendToBackend(blob) {
  const formData = new FormData();
  formData.append("file", blob, "frame.jpg");
  fetch(`${API_URL}/detect-gesture/`, {
    method: "POST",
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    gestureState = data.gestures;
  });
}
// === END GAME ===