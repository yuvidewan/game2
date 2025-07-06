// === First-Person Endless Runner: Smash Hit Style ===
// Uses: Three.js, webcam gesture backend
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
const MAX_AHEAD_SEGMENTS = 6;
const SEGMENT_AHEAD_DISTANCE = SEGMENT_LENGTH * MAX_AHEAD_SEGMENTS;

// --- UI Elements ---
const canvas = document.getElementById("game-canvas");
const statusDiv = document.getElementById("status");
const levelDiv = document.getElementById("level");
const scoreDiv = document.getElementById("score");
const tutorialDiv = document.getElementById("tutorial");

// Initialize the game when the window loads
window.onload = function () {
  init();
  // Add event listener for starting and restarting the game
  document.addEventListener("keydown", startGameListener);
};

function startGameListener(e) {
  if (gameState === "start" && e.code === "Space") {
    startGame();
  }
  if (gameState === "over" && e.code === "Space") {
    restartGame();
  }
}

function init() {
  // Scene setup
  scene = new THREE.Scene();
  clock = new THREE.Clock();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, PLAYER_HEIGHT, 0); // Initial camera position

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  // Set a dark background for better contrast with glowing elements
  renderer.setClearColor(0x1a1a2e); // Dark blue/purple background

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.4)); // Softer ambient light
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024; // Increase shadow quality
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -20;
  dirLight.shadow.camera.right = 20;
  dirLight.shadow.camera.top = 20;
  dirLight.shadow.camera.bottom = -20;
  scene.add(dirLight);

  // Add a subtle point light for more dynamic lighting
  const pointLight = new THREE.PointLight(0x00ffff, 0.5, 50); // Cyan light
  pointLight.position.set(0, 5, -20);
  scene.add(pointLight);

  // Load sounds
  sounds.hit = new Audio("https://cdn.pixabay.com/audio/2022/03/15/audio_115b9bfae2.mp3");
  sounds.collect = new Audio("https://cdn.pixabay.com/audio/2022/03/15/audio_115b9bfae2.mp3");

  // Fetch tutorial data from backend
  fetch(`${API_URL}/tutorial`).then(res => res.json()).then(data => {
    tutorialDiv.innerHTML = `<b>Controls:</b><ul>${data.controls.map(c => `<li>${c.gesture}: ${c.action}</li>`).join("")}</ul><b>Tips:</b> ${data.tips.join(", ")}`;
  });

  // Reset and start the game
  resetGame();
  startWebcamCapture();
  animate(); // Start the animation loop
  window.addEventListener('resize', onWindowResize, false); // Handle window resizing
}

// Handle window resizing
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function resetGame() {
  // Remove all objects from the scene except lights
  for (let i = scene.children.length - 1; i >= 0; i--) {
    if (!(scene.children[i] instanceof THREE.Light)) scene.remove(scene.children[i]);
  }
  corridorSegments = [];
  obstacles = [];
  collectibles = [];
  score = 0;
  distance = 0;
  speed = 0.5;
  camera.position.set(0, PLAYER_HEIGHT, 0); // Reset camera position
  gameState = "start";
  levelDiv.textContent = "POV RUNNER";
  scoreDiv.textContent = `Score: 0 | Distance: 0m`;
  statusDiv.textContent = "Press Space or Blink to Start!";

  // Add initial corridor segments and obstacles
  for (let i = 0; i < MAX_AHEAD_SEGMENTS; i++) {
    addCorridorSegment(-i * SEGMENT_LENGTH);
    addObstacle(-OBSTACLE_INTERVAL - i * OBSTACLE_INTERVAL);
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

// Function to add a new corridor segment (procedural generation)
function addCorridorSegment(z) {
  const corridorWidth = 6;
  const corridorHeight = 4;
  const wallThickness = 0.2;

  // Floor (darker, slightly reflective)
  const floorGeometry = new THREE.BoxGeometry(corridorWidth, wallThickness, SEGMENT_LENGTH);
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3a4e, roughness: 0.5, metalness: 0.1 });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.position.set(0, -wallThickness / 2, z - SEGMENT_LENGTH / 2);
  floor.receiveShadow = true;
  scene.add(floor);
  corridorSegments.push(floor);

  // Ceiling (darker, slightly reflective)
  const ceilingGeometry = new THREE.BoxGeometry(corridorWidth, wallThickness, SEGMENT_LENGTH);
  const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0x3a3a4e, roughness: 0.5, metalness: 0.1 });
  const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
  ceiling.position.set(0, corridorHeight + wallThickness / 2, z - SEGMENT_LENGTH / 2);
  ceiling.receiveShadow = true;
  scene.add(ceiling);
  corridorSegments.push(ceiling);

  // Left Wall (darker, with a subtle blue emissive glow)
  const leftWallGeometry = new THREE.BoxGeometry(wallThickness, corridorHeight + 2 * wallThickness, SEGMENT_LENGTH);
  const leftWallMaterial = new THREE.MeshStandardMaterial({ color: 0x2e2e4a, emissive: 0x000033, emissiveIntensity: 0.5 }); // Darker blue with glow
  const leftWall = new THREE.Mesh(leftWallGeometry, leftWallMaterial);
  leftWall.position.set(-corridorWidth / 2 - wallThickness / 2, corridorHeight / 2, z - SEGMENT_LENGTH / 2);
  leftWall.receiveShadow = true;
  scene.add(leftWall);
  corridorSegments.push(leftWall);

  // Right Wall (darker, with a subtle blue emissive glow)
  const rightWallGeometry = new THREE.BoxGeometry(wallThickness, corridorHeight + 2 * wallThickness, SEGMENT_LENGTH);
  const rightWallMaterial = new THREE.MeshStandardMaterial({ color: 0x2e2e4a, emissive: 0x000033, emissiveIntensity: 0.5 }); // Darker blue with glow
  const rightWall = new THREE.Mesh(rightWallGeometry, rightWallMaterial);
  rightWall.position.set(corridorWidth / 2 + wallThickness / 2, corridorHeight / 2, z - SEGMENT_LENGTH / 2);
  rightWall.receiveShadow = true;
  scene.add(rightWall);
  corridorSegments.push(rightWall);

  // Add glowing lines on the floor for visual guidance
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.7 }); // Cyan glowing line
  const lineGeometry = new THREE.BoxGeometry(0.1, 0.05, SEGMENT_LENGTH); // Thin line

  const leftLine = new THREE.Mesh(lineGeometry, lineMaterial);
  leftLine.position.set(-corridorWidth / 4, 0.05, z - SEGMENT_LENGTH / 2);
  scene.add(leftLine);
  corridorSegments.push(leftLine);

  const rightLine = new THREE.Mesh(lineGeometry, lineMaterial);
  rightLine.position.set(corridorWidth / 4, 0.05, z - SEGMENT_LENGTH / 2);
  scene.add(rightLine);
  corridorSegments.push(rightLine);
}


function addObstacle(z) {
  // Minimize early game load
  if (distance < 50 && Math.random() < 0.6) return;

  // Obstacle lanes (aligned with corridor interior)
  const lanePositions = [-2, 0, 2]; // narrower to match corridor
  const laneX = lanePositions[Math.floor(Math.random() * lanePositions.length)];

  // Randomly decide obstacle type: using simple shapes for now
  const obstacleType = Math.random() < 0.5 ? "box" : "sphere";

  let obstacleMesh;
  if (obstacleType === "box") {
    obstacleMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.5, 1.5),
      new THREE.MeshStandardMaterial({ color: 0xff4500, emissive: 0xff4500, emissiveIntensity: 0.7 }) // Orange-red glowing box
    );
  } else {
    obstacleMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x8a2be2, emissive: 0x8a2be2, emissiveIntensity: 0.7 }) // Blue-violet glowing sphere
    );
  }

  obstacleMesh.position.set(laneX, 1.5, z); // Position in the middle of the corridor height
  obstacleMesh.castShadow = true;
  scene.add(obstacleMesh);
  obstacles.push({ obj: obstacleMesh, type: obstacleType });

  // Add a coin only if far enough in the game
  if (distance > 30 && Math.random() < 0.4) {
    const coin = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 12), // lighter geometry
      new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.8 }) // Gold glowing coin
    );
    // Put coin in a different lane from obstacle
    const otherLanes = lanePositions.filter(x => x !== laneX);
    const coinX = otherLanes[Math.floor(Math.random() * otherLanes.length)];
    coin.position.set(coinX, 1.5, z - 4);
    scene.add(coin);
    collectibles.push(coin);
  }
}

// Main animation loop
function animate() {
  requestAnimationFrame(animate);
  if (gameState === "play") {
    // --- Update speed over time (much more gradual) ---
    // Base speed + a small fraction of distance, capped at a reasonable max increase
    // Increased distance divisor to 1000 and reduced max added speed to 0.7
    cameraSpeedTarget = 0.2 + Math.min(0.7, distance / 1000);
    // Reduced interpolation factor for even slower, smoother acceleration
    cameraSpeed += (cameraSpeedTarget - cameraSpeed) * 0.005;

    // --- Move camera forward ---
    camera.position.z -= cameraSpeed;
    distance += cameraSpeed;

    // --- Update score ---
    score = Math.floor(distance) + collectibles.filter(c => !c.visible).length * 10;
    scoreDiv.textContent = `Score: ${score} | Distance: ${Math.floor(distance)}m`;

    // --- Head tracking movement (mirroring face movements) ---
    // Ensure gestureState.head_x and gestureState.head_y are numbers
    let hx = typeof gestureState.head_x === 'number' ? gestureState.head_x : 0;
    let hy = typeof gestureState.head_y === 'number' ? gestureState.head_y : 0;

    // Clamp values from backend to prevent extreme camera movements
    hx = Math.max(-1, Math.min(1, hx));
    hy = Math.max(-1, Math.min(1, hy));

    // Scale head movements to camera position within corridor
    // Mirrored X-axis movement: if head_x is positive (right), targetCameraX becomes negative (left)
    targetCameraX = -hx * 2.5; // Increased sensitivity for X-axis movement, now mirrored
    targetCameraY = PLAYER_HEIGHT + hy * 2; // Increased sensitivity for Y-axis movement

    // Smooth camera movement towards the target position
    camera.position.x += (targetCameraX - camera.position.x) * 0.15;
    camera.position.y += (targetCameraY - camera.position.y) * 0.15;

    // --- Clamp camera position to corridor bounds ---
    // Corridor width is 6 units (-3 to 3 from center). Player radius is 0.8.
    // So, camera X should be roughly between -3 + PLAYER_RADIUS and 3 - PLAYER_RADIUS.
    // Using a slightly tighter bound for visual comfort.
    const minCameraX = -2.5;
    const maxCameraX = 2.5;
    camera.position.x = Math.max(minCameraX, Math.min(maxCameraX, camera.position.x));

    // Corridor height is 4 units (0 to 4). Player height is 2.
    // Camera Y should be roughly between 0 + PLAYER_HEIGHT/2 and 4 - PLAYER_HEIGHT/2.
    // Using a slightly tighter bound for visual comfort.
    const minCameraY = 0.5; // Minimum height (e.g., player's head won't go below chest level)
    const maxCameraY = 3.5; // Maximum height (e.g., player's head won't hit the ceiling)
    camera.position.y = Math.max(minCameraY, Math.min(maxCameraY, camera.position.y));


    // Make the camera look slightly ahead
    camera.lookAt(camera.position.x, camera.position.y, camera.position.z - 10);

    // --- Add corridor segments and obstacles ahead ---
    let furthestZ = corridorSegments.length ? corridorSegments[corridorSegments.length - 1].position.z : 0;
    while (furthestZ > camera.position.z - SEGMENT_AHEAD_DISTANCE) {
      furthestZ -= SEGMENT_LENGTH;
      addCorridorSegment(furthestZ);
      addObstacle(furthestZ + Math.random() * -OBSTACLE_INTERVAL);
    }

    // --- Remove corridor segments behind ---
    corridorSegments = corridorSegments.filter(segment => {
      if (segment.position.z > camera.position.z + 30) { // If segment is behind camera by 30 units
        scene.remove(segment);
        return false;
      }
      return true;
    });

    // --- Remove past obstacles ---
    obstacles = obstacles.filter(o => {
      if (o.obj.position.z > camera.position.z + 30) { // If obstacle is behind camera by 30 units
        scene.remove(o.obj);
        return false;
      }
      return true;
    });

    // --- Remove past collectibles ---
    collectibles = collectibles.filter(c => {
      if (c.position.z > camera.position.z + 30) { // If collectible is behind camera by 30 units
        scene.remove(c);
        return false;
      }
      return true;
    });

    // --- Collision checks ---
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
    let dy = camera.position.y - pos.y; // Use obstacle's actual Y position
    let dz = camera.position.z - pos.z;
    let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    // Adjust collision detection thresholds based on player and obstacle sizes
    if (Math.abs(dz) < (PLAYER_RADIUS + 0.7) && Math.abs(dx) < (PLAYER_RADIUS + 0.7) && Math.abs(dy) < (PLAYER_RADIUS + 0.7)) {
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
  }).catch(error => {
    console.error("Error accessing webcam:", error);
    statusDiv.textContent = "Webcam access denied. Game will not track head movements.";
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
    // Update gestureState with head_x and head_y for camera mirroring
    gestureState = data.gestures;
  })
  .catch(error => {
    console.error("Error sending frame to backend:", error);
  });
}
// === END GAME ===
