import * as THREE from 'three';
import { TEAM_COLORS, TANK_SIZE, BULLET_RADIUS, FLAG_RADIUS, ENDZONE_W, ENDZONE_H, WALLS } from './graphics.js';
import { WIDTH, HEIGHT } from './constants.js';

// Scene globals
let scene, camera, renderer;
let tankMeshes = [];
let bulletMeshes = [];
let flagMeshes = {};
let endzoneMeshes = {};
let wallMeshes = [];
let webglSupported = true;

// Initialize Three.js scene
function init3DScene(canvas) {
    try {
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x222222);
        
        // Create camera
        camera = new THREE.OrthographicCamera(
            0, WIDTH, HEIGHT, 0, 0.1, 1000
        );
        camera.position.z = 500;
        
        // Create renderer
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(WIDTH, HEIGHT);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(WIDTH/2, HEIGHT/2, 500);
        scene.add(directionalLight);
        
        // Create grid helper
        createGrid();
        
        // Create walls
        createWalls();
        
        return { scene, camera, renderer };
    } catch (e) {
        console.error("WebGL is not supported or context creation failed:", e);
        webglSupported = false;
        return null;
    }
}

function createGrid() {
    // Create grid using lines
    const gridGroup = new THREE.Group();
    
    // Vertical lines
    for (let x = 0; x <= WIDTH; x += 20) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, 0, 0),
            new THREE.Vector3(x, HEIGHT, 0)
        ]);
        const material = new THREE.LineBasicMaterial({ color: 0x555555 });
        const line = new THREE.Line(geometry, material);
        gridGroup.add(line);
    }
    
    // Horizontal lines
    for (let y = 0; y <= HEIGHT; y += 20) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, y, 0),
            new THREE.Vector3(WIDTH, y, 0)
        ]);
        const material = new THREE.LineBasicMaterial({ color: 0x555555 });
        const line = new THREE.Line(geometry, material);
        gridGroup.add(line);
    }
    
    scene.add(gridGroup);
}

function createWalls() {
    wallMeshes = [];
    for (const wall of WALLS) {
        const geometry = new THREE.BoxGeometry(wall.w, wall.h, 20);
        const material = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const wallMesh = new THREE.Mesh(geometry, material);
        wallMesh.position.set(wall.x + wall.w/2, wall.y + wall.h/2, 10);
        scene.add(wallMesh);
        wallMeshes.push(wallMesh);
    }
}

function createEndzones(endzones) {
    // Clear existing endzones
    Object.values(endzoneMeshes).forEach(mesh => scene.remove(mesh));
    endzoneMeshes = {};
    
    // Create new endzones
    for (const [team, endzoneData] of Object.entries(endzones)) {
        const zone = endzoneData.zone;
        const geometry = new THREE.BoxGeometry(zone.w, zone.h, 5);
        const material = new THREE.MeshPhongMaterial({ 
            color: new THREE.Color(TEAM_COLORS[team]),
            transparent: true,
            opacity: 0.3
        });
        const endzoneMesh = new THREE.Mesh(geometry, material);
        endzoneMesh.position.set(zone.x + zone.w/2, zone.y + zone.h/2, 2.5);
        scene.add(endzoneMesh);
        endzoneMeshes[team] = endzoneMesh;
    }
}

function createFlags(flags) {
    // Clear existing flags
    Object.values(flagMeshes).forEach(mesh => scene.remove(mesh));
    flagMeshes = {};
    
    // Create new flags
    for (const [team, flagData] of Object.entries(flags)) {
        const geometry = new THREE.SphereGeometry(FLAG_RADIUS, 16, 16);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0xffd700, // Gold color
            emissive: 0x333300
        });
        const flagMesh = new THREE.Mesh(geometry, material);
        flagMeshes[team] = flagMesh;
        scene.add(flagMesh);
    }
}

function updateFlags(flags) {
    for (const [team, flagData] of Object.entries(flags)) {
        if (flagMeshes[team]) {
            const pos = flagData.carrier ? flagData.carrier.pos : flagData.pos;
            flagMeshes[team].position.set(pos.x, pos.y, 20);
        }
    }
}

function createTanks(tanks) {
    if (!webglSupported) return;
    
    // Clear existing tanks
    tankMeshes.forEach(mesh => scene.remove(mesh));
    tankMeshes = [];
    
    // Create new tanks
    for (const tank of tanks) {
        const tankGroup = new THREE.Group();
        
        // Tank body
        const bodyGeometry = new THREE.BoxGeometry(TANK_SIZE.w, TANK_SIZE.h, 10);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: new THREE.Color(TEAM_COLORS[tank.team])
        });
        const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        tankGroup.add(bodyMesh);
        
        // Turret
        const turretGeometry = new THREE.BoxGeometry(16, TANK_SIZE.h, 8);
        const turretMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
        const turretMesh = new THREE.Mesh(turretGeometry, turretMaterial);
        turretMesh.position.y = 0;
        tankGroup.add(turretMesh);
        
        // Barrel
        const barrelGeometry = new THREE.BoxGeometry(6, 10, 4);
        const barrelMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
        const barrelMesh = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrelMesh.position.y = TANK_SIZE.h/2 + 5;
        tankGroup.add(barrelMesh);
        
        scene.add(tankGroup);
        tankMeshes.push(tankGroup);
    }
}

function updateTanks(tanks) {
    if (!webglSupported || !tankMeshes) return;
    
    tanks.forEach((tank, index) => {
        if (index < tankMeshes.length) {
            const tankGroup = tankMeshes[index];
            
            // Update position
            tankGroup.position.set(tank.pos.x, tank.pos.y, 5);
            
            // Update rotation
            tankGroup.rotation.z = tank.dir;
            
            // Update turret rotation relative to tank
            if (tankGroup.children.length > 1) {
                tankGroup.children[1].rotation.z = tank.turret - tank.dir;
            }
            
            // Update transparency for hit cooldown
            if (tank.hitCooldown > 0) {
                const flashIntensity = Math.sin(tank.flashTimer * 10) * 0.5 + 0.5;
                const alpha = 0.3 + flashIntensity * 0.7;
                tankGroup.children.forEach(child => {
                    if (child.material) {
                        child.material.opacity = alpha;
                        child.material.transparent = true;
                    }
                });
            } else {
                tankGroup.children.forEach(child => {
                    if (child.material) {
                        child.material.opacity = 1.0;
                        child.material.transparent = false;
                    }
                });
            }
            
            // Flag carrier marker
            // We'll handle this with the flag itself being positioned above the tank
        }
    });
}

function createBullets(bullets) {
    if (!webglSupported) return;
    
    // Clear existing bullets
    bulletMeshes.forEach(mesh => scene.remove(mesh));
    bulletMeshes = [];
    
    // Create new bullets
    for (const bullet of bullets) {
        const geometry = new THREE.SphereGeometry(BULLET_RADIUS, 8, 8);
        const material = new THREE.MeshPhongMaterial({ color: 0x000000 });
        const bulletMesh = new THREE.Mesh(geometry, material);
        scene.add(bulletMesh);
        bulletMeshes.push(bulletMesh);
    }
}

function updateBullets(bullets) {
    if (!webglSupported || !bulletMeshes) return;
    
    // Update positions of existing bullets
    bullets.forEach((bullet, index) => {
        if (index < bulletMeshes.length) {
            bulletMeshes[index].position.set(bullet.pos.x, bullet.pos.y, 15);
        }
    });
    
    // If we have more bullets than meshes, create new ones
    while (bulletMeshes.length < bullets.length) {
        const geometry = new THREE.SphereGeometry(BULLET_RADIUS, 8, 8);
        const material = new THREE.MeshPhongMaterial({ color: 0x000000 });
        const bulletMesh = new THREE.Mesh(geometry, material);
        scene.add(bulletMesh);
        bulletMeshes.push(bulletMesh);
    }
    
    // If we have fewer bullets than meshes, remove excess
    while (bulletMeshes.length > bullets.length) {
        const mesh = bulletMeshes.pop();
        scene.remove(mesh);
    }
}

function render3D(renderer, scene, camera, WIDTH, HEIGHT, tanks, bullets, flags, endzones, score, round, roundTimer, gameOver, isMobile, canvasScale) {
    if (!webglSupported || !renderer || !scene || !camera) return;
    
    try {
        // Update camera aspect ratio if needed
        if (isMobile && canvasScale !== 1) {
            renderer.setSize(WIDTH * canvasScale, HEIGHT * canvasScale);
        } else {
            renderer.setSize(WIDTH, HEIGHT);
        }
        
        // Render the scene
        renderer.render(scene, camera);
    } catch (e) {
        console.error("Error rendering 3D scene:", e);
    }
}

export { 
    init3DScene,
    createTanks,
    updateTanks,
    createBullets,
    updateBullets,
    createFlags,
    updateFlags,
    createEndzones,
    render3D
};
