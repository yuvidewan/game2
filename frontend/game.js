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

// Create a single, continuous ground plane once in init()
let jungleGround;

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
    scene.background = new THREE.TextureLoader().load("images/bg_img.png");
    clock = new THREE.Clock();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, PLAYER_HEIGHT, 0); // Initial camera position

    // Renderer setup
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = false;
    const loader = new THREE.TextureLoader();
    loader.load("images/bg_img.png", function(texture) {
        scene.background = texture;
});

    renderer.outputEncoding = THREE.sRGBEncoding; // Correct color rendering

    // Lighting: natural, not washed out
    scene.add(new THREE.AmbientLight(0xffffff, 0.7)); // Natural ambient
    const sunLight = new THREE.DirectionalLight(0xfffbe0, 1.1);
    sunLight.position.set(20, 40, 10);
    scene.add(sunLight);
    for (let i = 0; i < 3; i++) {
        const z = -i * 60;
        const sunbeam = new THREE.PointLight(0xfffbe0, 0.5, 60);
        sunbeam.position.set((i % 2 === 0 ? -3 : 3), 8, z);
        scene.add(sunbeam);
    }

    // Load sounds
    sounds.hit = new Audio("https://cdn.pixabay.com/audio/2022/03/15/audio_115b9bfae2.mp3");
    sounds.collect = new Audio("https://cdn.pixabay.com/audio/2022/03/15/audio_115b9bfae2.mp3");

    // Fetch tutorial data from backend
    // fetch(`${API_URL}/tutorial`).then(res => res.json()).then(data => {
    //   tutorialDiv.innerHTML = `<b>Controls:</b><ul>${data.controls.map(c => `<li>${c.gesture}: ${c.action}</li>`).join("")}</ul><b>Tips:</b> ${data.tips.join(", ")}`;
    // });

    // Reset and start the game
    resetGame();
    startWebcamCapture();
    animate(); // Start the animation loop
    window.addEventListener('resize', onWindowResize, false); // Handle window resizing

    // Remove any old ground if present
    if (jungleGround) scene.remove(jungleGround);
    // Create a large green ground plane
    const groundGeometry = new THREE.BoxGeometry(20, 0.3, 1000);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x3fa34d, // Jungle grass green
        roughness: 0.7,
        metalness: 0.1,
    });
    jungleGround = new THREE.Mesh(groundGeometry, groundMaterial);
    jungleGround.position.set(0, -0.15, -500); // Centered under the player
    scene.add(jungleGround);
    sounds.bg = new Audio("audio/bg_music.mp3");
    sounds.bg.loop = true;
    sounds.bg.volume = 0.6;
}

// Handle window resizing
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function resetGame() {
    // Remove all objects from the scene except lights and fog
    for (let i = scene.children.length - 1; i >= 0; i--) {
        if (!(scene.children[i] instanceof THREE.Light) && !(scene.children[i] instanceof THREE.Fog)) {
            scene.remove(scene.children[i]);
        }
    }
    corridorSegments = [];
    obstacles = [];
    collectibles = [];
    score = 0;
    distance = 0;
    speed = 0.5;
    camera.position.set(0, PLAYER_HEIGHT, 0); // Reset camera position
    gameState = "start";
    scoreDiv.textContent = `Distance: 0m`;

    // Add initial corridor segments and obstacles
    for (let i = 0; i < MAX_AHEAD_SEGMENTS; i++) {
        addCorridorSegment(-i * SEGMENT_LENGTH);
        addObstacle(-OBSTACLE_INTERVAL - i * OBSTACLE_INTERVAL);
    }
}

function startGame() {
    gameState = "play";

    const infoBox = document.getElementById("game-info");
    if (infoBox) {
        infoBox.style.display = "none";
    }

    if (sounds.bg) sounds.bg.play();
}


function restartGame() {
    resetGame();
    startGame();
    if (sounds.bg) {
        sounds.bg.pause();
        sounds.bg.currentTime = 0;
    }
}

// Only add the dirt path and tufts in addCorridorSegment, not the ground
function addCorridorSegment(z) {
    const SEGMENT_LENGTH = 40;
    // Path: rich brown dirt trail
    const path = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.04, SEGMENT_LENGTH),
        new THREE.MeshStandardMaterial({ color: 0x7c5c36, roughness: 0.8 })
    );
    path.position.set(0, 0.04, z - SEGMENT_LENGTH / 2);
    scene.add(path);
    corridorSegments.push(path);
    // Grass tufts: random small deep green spheres
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

// Smaller obstacles: boulders and logs
function addObstacle(z) {
    if (distance < 50 && Math.random() < 0.6) return;

    const lanePositions = [-2, 0, 2];
    const laneX = lanePositions[Math.floor(Math.random() * lanePositions.length)];
    const obstacleType = Math.random() < 0.5 ? "boulder" : "log";
    let obstacleMesh;

    if (obstacleType === "boulder") {
        obstacleMesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.2, 1),
            new THREE.MeshStandardMaterial({
                color: 0x777777, // stone grey
                roughness: 0.85,
                metalness: 0.1,
            })
        );

        // Add moss tuft
        const moss = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshStandardMaterial({
                color: 0x3fa34d,
                roughness: 0.7,
            })
        );
        moss.position.set(0.5, 0.5, 0);
        obstacleMesh.add(moss);

    } else {
        obstacleMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.42, 0.42, 3, 16),
            new THREE.MeshStandardMaterial({
                color: 0x8b5a2b, // bark color
                roughness: 0.7,
                metalness: 0.2,
            })
        );
        obstacleMesh.rotation.z = Math.PI / 2;

        // Tree ring caps on ends
        const capMaterial = new THREE.MeshStandardMaterial({
            color: 0xf4d9a4, // pale wood color
            roughness: 0.5,
        });

        const capGeo = new THREE.CircleGeometry(0.42, 16);
        const cap1 = new THREE.Mesh(capGeo, capMaterial);
        const cap2 = new THREE.Mesh(capGeo, capMaterial);
        cap1.rotation.y = Math.PI / 2;
        cap1.position.x = 1.5;
        cap2.rotation.y = -Math.PI / 2;
        cap2.position.x = -1.5;
        obstacleMesh.add(cap1);
        obstacleMesh.add(cap2);

        // Moss accent
        const moss = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 8, 8),
            new THREE.MeshStandardMaterial({
                color: 0x355e2c,
                roughness: 0.7,
            })
        );
        moss.position.set(0, 0.45, 0);
        obstacleMesh.add(moss);
    }

    obstacleMesh.position.set(laneX, 1.05, z);
    scene.add(obstacleMesh);
    obstacles.push({ obj: obstacleMesh, type: obstacleType });

    // Jungle berry collectible
    if (distance > 30 && Math.random() < 0.4) {
        const berry = new THREE.Mesh(
            new THREE.SphereGeometry(0.33, 14, 14),
            new THREE.MeshStandardMaterial({
                color: 0xc0392b,
                emissive: 0xc0392b,
                emissiveIntensity: 1.2,
                roughness: 0.15,
                metalness: 0.4,
            })
        );
        const leaf = new THREE.Mesh(
            new THREE.SphereGeometry(0.13, 8, 8),
            new THREE.MeshStandardMaterial({
                color: 0x355e2c,
                roughness: 0.6,
            })
        );
        leaf.position.set(0.16, 0.16, 0);
        berry.add(leaf);
        const otherLanes = lanePositions.filter(x => x !== laneX);
        const berryX = otherLanes[Math.floor(Math.random() * otherLanes.length)];
        berry.position.set(berryX, 1.05, z - 4);
        scene.add(berry);
        collectibles.push({ mesh: berry, type: "slow" });
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
        score = Math.floor(distance) + collectibles.filter(c => !c.mesh.visible).length * 10;
        scoreDiv.textContent = `Distance: ${Math.floor(distance)}m`;

        // --- Head tracking movement (translation: moving head left/right/up/down) ---
        // head_x: -1 (moved left), 0 (center), 1 (moved right)
        // head_y: 1 (moved up), 0 (center), -1 (moved down)
        let hx = typeof gestureState.head_x === 'number' ? gestureState.head_x : 0;
        let hy = typeof gestureState.head_y === 'number' ? gestureState.head_y : 0;
        hx = Math.max(-1, Math.min(1, hx));
        hy = Math.max(-1, Math.min(1, hy));
        // Increased sensitivity and mirrored X movement
        const sensitivityX = 3.5;
        const sensitivityY = 2.8;
        targetCameraX = -hx * sensitivityX;
        targetCameraY = PLAYER_HEIGHT + hy * sensitivityY;

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
            if (c.mesh.position.z > camera.position.z + 30) { // If collectible is behind camera by 30 units
                scene.remove(c.mesh);
                return false;
            }
            return true;
        });

        // --- Collision checks ---
        checkObstacleCollisions();
        checkCollectibles();
    }

    if (gameState === "over") {
        // Optionally show overlay or message, but do not use statusDiv
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
            if (sounds.bg) sounds.bg.volume = 0.1;
            break;
        }
    }
}

// Powerup logic: slow down runner for 5 seconds
let slowEffectActive = false;
let slowEffectTimeout = null;
function checkCollectibles() {
    for (let i = 0; i < collectibles.length; i++) {
        let c = collectibles[i];
        let pos = c.mesh.position;
        let dx = camera.position.x - pos.x;
        let dy = camera.position.y - pos.y;
        let dz = camera.position.z - pos.z;
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < PLAYER_RADIUS + 0.5 && c.mesh.visible) {
            c.mesh.visible = false;
            sounds.collect.play();
            if (c.type === "slow") {
                activateSlowEffect();
            }
        }
    }
}
function activateSlowEffect() {
    if (slowEffectTimeout) clearTimeout(slowEffectTimeout);
    slowEffectActive = true;
    speed = 0.2; // Slow speed
    showSlowOverlay();
    slowEffectTimeout = setTimeout(() => {
        slowEffectActive = false;
        speed = 0.5; // Restore normal speed
        hideSlowOverlay();
    }, 5000);
}
// Visual feedback for slow effect
function showSlowOverlay() {
    const overlay = document.getElementById("overlay");
    overlay.style.display = "flex";
    overlay.style.background = "rgba(50, 150, 50, 0.25)";
    overlay.textContent = "Jungle Berry Power! Slowed Down!";
}
function hideSlowOverlay() {
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