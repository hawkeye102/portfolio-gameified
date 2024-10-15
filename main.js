


import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Create a scene
const scene = new THREE.Scene();
scene.background = new THREE.TextureLoader().load('sky(3).jpg');

// Create a camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.5, 5);

// Create a renderer and link it to the canvas in the HTML
const canvas = document.querySelector(".draw");
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Add lighting to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// Load the running man model
const loader = new GLTFLoader();
let mixer;
let character;
let baseSpeed = 0.2; // Initial speed
let speed = baseSpeed; // Current speed
let speedIncrement = 0.01; // Base increment
let obstacles = [];
let gameOver = false;
let distanceTraveled = 0;
let obstacleInterval;
let gameStarted = false;

loader.load(
    '/male_running_20_frames_loop.glb',
    function (gltf) {
        character = gltf.scene;
        character.scale.set(1, 1, 1);
        character.position.set(0, 0, 0);
        scene.add(character);

        mixer = new THREE.AnimationMixer(character);
        gltf.animations.forEach((clip) => {
            mixer.clipAction(clip).play();
        });
    },
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
        console.error('An error happened while loading the GLTF file:', error);
    }
);

// Load the road texture
const textureLoader = new THREE.TextureLoader();
const roadTexture = textureLoader.load('/road.jpg', (texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 10);
});

// Create the road
const roadGeometry = new THREE.PlaneGeometry(10, 10000);
const roadMaterial = new THREE.MeshStandardMaterial({ map: roadTexture });
const road = new THREE.Mesh(roadGeometry, roadMaterial);
road.rotation.x = -Math.PI / 2;
scene.add(road);

// Function to create obstacles
function createObstacle(x, z) {
    const obstacleGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32); // Cylinder shape
    const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    obstacle.position.set(x, 0.5, z);
    scene.add(obstacle);
    obstacles.push(obstacle);
}

// Player movement variables
let playerX = 0;

// Keyboard controls
window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
        playerX = Math.max(-3, playerX - 1);
    } else if (event.key === 'ArrowRight') {
        playerX = Math.min(3, playerX + 1);
    }
});

// Function to check for collisions
function checkCollision() {
    if (!character) return;

    const characterBox = new THREE.Box3().setFromObject(character);

    for (let obstacle of obstacles) {
        const obstacleBox = new THREE.Box3().setFromObject(obstacle);

        if (characterBox.intersectsBox(obstacleBox)) {
            gameOver = true;
            alert('Game Over! Restarting...');
            resetGame();
            break;
        }
    }
}

// Function to reset the game
function resetGame() {
    if (character) {
        character.position.set(0, 0, 0);
        character.rotation.set(0, 0, 0);
    }
    speed = baseSpeed; // Reset speed to base
    distanceTraveled = 0;
    obstacles.forEach(obstacle => scene.remove(obstacle));
    obstacles = [];
    gameOver = false;

    createInitialObstacles(); // Create initial obstacles after resetting
    startGeneratingObstacles(); // Restart obstacle generation
}

// Function to start generating obstacles continuously
function startGeneratingObstacles() {
    obstacleInterval = setInterval(() => {
        if (!gameOver && obstacles.length < 10) { // Limit total obstacles
            const randomX = (Math.random() - 0.5) * 6; // Random X between -3 and 3
            const randomZ = Math.random() * 800 + 500; // Set Z position further away

            // Increase obstacle density in the middle section
            if (distanceTraveled >= 200 && distanceTraveled <= 400) {
                // Generate obstacles more frequently
                if (Math.random() < 0.5) { // 50% chance to generate an obstacle
                    createObstacle(randomX, randomZ);
                }
            } else {
                // Normal generation rate outside the middle section
                if (distanceTraveled >= 100 && Math.random() < 0.3) { // 30% chance
                    createObstacle(randomX, randomZ);
                }
            }
        }
    }, 1000); // Adjust the interval as needed
}

// Function to show the initial message
function showInitialMessage() {
    const initialMessage = document.createElement('div');
    initialMessage.innerText = 'Use Arrow Keys to Move!';
    initialMessage.style.position = 'absolute';
    initialMessage.style.top = '20px';
    initialMessage.style.left = '50%';
    initialMessage.style.transform = 'translateX(-50%)';
    initialMessage.style.color = '#fff';
    initialMessage.style.fontSize = '24px';
    initialMessage.style.zIndex = 1000; // Ensure it's above other elements
    document.body.appendChild(initialMessage);

    setTimeout(() => {
        document.body.removeChild(initialMessage);
        gameStarted = true; // Start the game after message is dismissed
    }, 3000); // Show for 3 seconds
}

// Portfolio information display at checkpoints
const portfolioInfo = document.getElementById('portfolio-info');
let currentPortfolio = null;

function showPortfolioInfo(info) {
    portfolioInfo.innerHTML = info; // Update the info displayed on the screen
    portfolioInfo.style.display = 'block'; // Show the info

    if (currentPortfolio) clearTimeout(currentPortfolio); // Clear previous timeout

    currentPortfolio = setTimeout(() => {
        portfolioInfo.style.display = 'none'; // Hide the info after 5 seconds
        currentPortfolio = null; // Reset the currentPortfolio timeout

        // Alert after the last portfolio info
        if (info.includes('Contact:')) {
            setTimeout(() => {
                alert('Do you want to continue playing?');
            }, 1000); // Wait for 1 second before showing alert
        }
    }, 5000); // 5 seconds delay
}

// Animation loop
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    if (mixer) {
        const delta = clock.getDelta();
        mixer.update(delta);
    }

    if (character && !gameOver) {
        character.position.z += speed;
        character.position.x = playerX;
        distanceTraveled += speed;

        // Increase speed over time
        if (Math.floor(distanceTraveled) % 100 === 0) {
            speed += speedIncrement; // Increase speed every 100 units traveled
        }

        // Portfolio information display at checkpoints
        if (distanceTraveled > 100 && distanceTraveled < 110) {
            showPortfolioInfo(`
                <div class="portfolio-box">
                    <h2>Name:</h2>
                    <p>Vijay Bhatt</p>
                    <h3>About Me:</h3>
                    <p>I enjoy exploring web development and networking,
                    with a background in electronic science. 
                    I enjoy creating interactive projects and 
                    experimenting with new technologies. 
                    I believe in continuous learning and
                     strive to improve my skills every day!</p>
                </div>
            `);
        } else if (distanceTraveled > 300 && distanceTraveled < 310) {
            showPortfolioInfo(`
                <div class="portfolio-box">
                    <h2>Skills:</h2>
                    <p>JS, HTML, CSS, Webpack, Node.js, Jest, Three.js, Git, GitHub, Responsive Web Design.</p>
                </div>
            `);
        } else if (distanceTraveled > 600 && distanceTraveled < 610) {
            showPortfolioInfo(`
                <div class="portfolio-box">
                    <h2>Projects:</h2>
                    <p>An interactive endless 3D obstacle game.</p>
                    <p>A battleship game.</p>
                    <p>Tic Tac Toe.</p>
                </div>
            `);
        } else if (distanceTraveled > 900 && distanceTraveled < 910) {
            showPortfolioInfo(`
                <div class="portfolio-box">
                    <h2>Contact:</h2>
                    <p>Email: vijay.bhatt@iic.ac.in</p>
                    <p>GitHub: hawkeye102</p>
                </div>
            `);
        }

        // Check if the character is beyond a certain distance to remove old obstacles
        obstacles.forEach((obstacle, index) => {
            if (obstacle.position.z < character.position.z - 50) {
                scene.remove(obstacle);
                obstacles.splice(index, 1); // Remove from array
            }
        });

        camera.position.set(0, 1.5, character.position.z - 5);
        camera.lookAt(character.position);
    }

    checkCollision();
    renderer.render(scene, camera);
}

// Start the game with the initial message
showInitialMessage();

// Create initial obstacles
createInitialObstacles(); // Create initial obstacles

// Start generating obstacles
startGeneratingObstacles(); // Start generating obstacles

// Start the animation loop
animate();

// Handle window resizing
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

// Initial obstacle creation function
function createInitialObstacles() {
    for (let i = 0; i < 10; i++) { // Create 10 initial obstacles
        const randomX = (Math.random() - 0.5) * 6; // Random X between -3 and 3
        const randomZ = Math.random() * 500; // Set Z position between 0 and 500
        createObstacle(randomX, randomZ);
    }
}
