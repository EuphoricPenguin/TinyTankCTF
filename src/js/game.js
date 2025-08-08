import { initAudio, playGunshotSound, soundEnabled, audioContext } from './sound.js';
import { aiUpdate } from './ai.js';
import { Vec, rectCircleColl, circleCircleColl, rectRectColl } from './utils.js';
import { 
  render, 
  drawTank, 
  drawBullet, 
  drawFlag, 
  drawEndzone,
  TEAM_COLORS,
  TANK_SIZE,
  BULLET_RADIUS,
  FLAG_RADIUS,
  ENDZONE_W,
  ENDZONE_H,
  WALLS
} from './graphics.js';
import { 
  init3DScene,
  createTanks,
  updateTanks,
  createBullets,
  updateBullets,
  createFlags,
  updateFlags,
  createEndzones,
  render3D
} from './graphics3d.js';
import { setupControls, mouse, keys, leftJoystick, rightTouchpad, fireButton, isMobile } from './controls.js';

import '../css/styles.css';

// Import game constants
import { 
  WIDTH, 
  HEIGHT, 
  BULLET_SPEED, 
  BULLET_LIFE, 
  TANK_SPEED, 
  ROT_SPEED, 
  HIT_COOLDOWN, 
  ROUND_TIME 
} from './constants.js';

// Game state
let canvas2D, ctx2D; // 2D canvas for HUD and overlays
let canvas3D; // 3D canvas for Three.js
let scene, camera, renderer; // Three.js objects
let use3D = true;
let tanks = [];
let bullets = [];
let score = { red: 0, blue: 0 };
let round = 1;
let roundTimer = ROUND_TIME;
let gameOver = false;
let aiTimer = 0;
let canvasScale = 1;

// Initialize the game
function initGame() {
    canvas3D = document.getElementById('gameCanvas3D');
    canvas2D = document.getElementById('gameCanvas2D');
    ctx2D = canvas2D.getContext('2d');
    
    // Initialize Three.js scene
    const threeObjects = init3DScene(canvas3D);
    if (threeObjects) {
        scene = threeObjects.scene;
        camera = threeObjects.camera;
        renderer = threeObjects.renderer;
        use3D = true;
        console.log("WebGL is supported - using 3D rendering");
    } else {
        use3D = false;
        console.log("WebGL is not supported - falling back to 2D rendering");
    }
    
    setupCanvas();
    setupControls(canvas3D, WIDTH, HEIGHT);
    initTanks();
    initAudio();
    
    // Handle window resize
    window.addEventListener('resize', setupCanvas);
    
    // Start game loop
    let lastTime = performance.now();
    function gameLoop(now) {
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        if (!gameOver) update(dt);
        
        if (use3D) {
            // Render with Three.js
            render3D(renderer, scene, camera, WIDTH, HEIGHT, tanks, bullets, flags, endzones, score, round, roundTimer, gameOver, isMobile(), canvasScale);
        }
        
        // Render 2D overlay for HUD and game over screen
        render2DOverlay(ctx2D, WIDTH, HEIGHT, score, round, roundTimer, gameOver, isMobile(), canvasScale);
        
        requestAnimationFrame(gameLoop);
    }
    requestAnimationFrame(gameLoop);
}

// Setup canvas scaling
function setupCanvas() {
    const container = document.querySelector('.game-container');
    
    // For desktop, use fixed dimensions
    if (!isMobile()) {
        canvas3D.width = WIDTH;
        canvas3D.height = HEIGHT;
        canvas2D.width = WIDTH;
        canvas2D.height = HEIGHT;
        return;
    }
    
    // For mobile, scale to fit screen while maintaining aspect ratio
    const maxWidth = container.clientWidth;
    const maxHeight = container.clientHeight;
    const padding = 40; // Add padding for mobile controls
    
    // Use available space accounting for control areas
    const maxWidthWithControls = maxWidth - (padding * 2 + 200);
    const maxHeightWithControls = maxHeight - (padding * 2 + 180);
    
    // Maintain aspect ratio
    const scale = Math.min(maxWidthWithControls / WIDTH, maxHeightWithControls / HEIGHT, 0.9); // Cap at 90% scale
    
    canvas3D.width = WIDTH * scale;
    canvas3D.height = HEIGHT * scale;
    canvas2D.width = WIDTH * scale;
    canvas2D.height = HEIGHT * scale;
    
    // Store scale for input adjustment
    canvasScale = scale;
    
    // Update renderer size if using Three.js
    if (renderer) {
        renderer.setSize(canvas3D.width, canvas3D.height);
    }
}

// Initialize tanks
function initTanks() {
    tanks = [];
    // red team
    tanks.push(new Tank('red', new Vec(100, HEIGHT / 2), 0));
    tanks.push(new Tank('red', new Vec(100, HEIGHT / 2 - 40), 0));
    tanks.push(new Tank('red', new Vec(100, HEIGHT / 2 + 40), 0));
    // blue team
    tanks.push(new Tank('blue', new Vec(WIDTH - 100, HEIGHT / 2), Math.PI));
    tanks.push(new Tank('blue', new Vec(WIDTH - 100, HEIGHT / 2 - 40), Math.PI));
    tanks.push(new Tank('blue', new Vec(WIDTH - 100, HEIGHT / 2 + 40), Math.PI));
    
    // Create 3D representations if using 3D
    if (use3D) {
        createTanks(tanks);
    }
    resetFlags();
}

// Game objects
const endzones = {
    red: { 
        team: 'red', 
        zone: { x: 10, y: HEIGHT / 2 - ENDZONE_H / 2, w: ENDZONE_W, h: ENDZONE_H },
        draw: function(ctx) { drawEndzone(ctx, this); }
    },
    blue: { 
        team: 'blue', 
        zone: { x: WIDTH - ENDZONE_W - 10, y: HEIGHT / 2 - ENDZONE_H / 2, w: ENDZONE_W, h: ENDZONE_H },
        draw: function(ctx) { drawEndzone(ctx, this); }
    }
};

const flags = {
    red: { 
        team: 'red', 
        zone: endzones.red.zone,
        pos: new Vec(endzones.red.zone.x + endzones.red.zone.w / 2, endzones.red.zone.y + endzones.red.zone.h / 2),
        carrier: null,
        reset: function() {
            this.carrier = null;
            this.pos = new Vec(this.zone.x + this.zone.w / 2, this.zone.y + this.zone.h / 2);
        },
        draw: function(ctx) { drawFlag(ctx, this); }
    },
    blue: { 
        team: 'blue', 
        zone: endzones.blue.zone,
        pos: new Vec(endzones.blue.zone.x + endzones.blue.zone.w / 2, endzones.blue.zone.y + endzones.blue.zone.h / 2),
        carrier: null,
        reset: function() {
            this.carrier = null;
            this.pos = new Vec(this.zone.x + this.zone.w / 2, this.zone.y + this.zone.h / 2);
        },
        draw: function(ctx) { drawFlag(ctx, this); }
    }
};

// Tank class
class Tank {
    constructor(team, pos, dir) {
        this.team = team;
        this.pos = pos;
        this.dir = dir;
        this.turret = dir;
        this.speed = 0;
        this.turn = 0;
        this.cooldown = 0;
        this.hitCooldown = 0;
        this.hasFlag = false;
        this.flashTimer = 0;
    }

    update(dt) {
        /* movement */
        this.dir += this.turn * ROT_SPEED * dt;
        const move = new Vec(Math.cos(this.dir), Math.sin(this.dir))
            .mul(this.speed * dt);
        this.pos = this.pos.add(move);

        /* collision with walls */
        const tankRect = {
            x: this.pos.x - TANK_SIZE.w / 2,
            y: this.pos.y - TANK_SIZE.h / 2,
            w: TANK_SIZE.w,
            h: TANK_SIZE.h
        };

        for (const wall of WALLS) {
            if (rectRectColl(tankRect, wall)) {
                const revert = move.mul(-1);
                this.pos = this.pos.add(revert);
                break;
            }
        }

        /* keep inside bounds */
        this.pos.x = Math.max(0, Math.min(WIDTH, this.pos.x));
        this.pos.y = Math.max(0, Math.min(HEIGHT, this.pos.y));

        /* turret control */
        if (this.team === 'red' && this === tanks[0]) { // human player
            if (isMobile() && rightTouchpad.active) {
                this.turret = rightTouchpad.angle;
            } else if (!isMobile()) {
                const dx = mouse.x - this.pos.x;
                const dy = mouse.y - this.pos.y;
                this.turret = Math.atan2(dy, dx);
            }
        }

        /* cooldowns */
        if (this.cooldown > 0) this.cooldown -= dt;
        if (this.hitCooldown > 0) {
            this.hitCooldown -= dt;
            this.flashTimer += dt;
        }
    }

    fire() {
        if (this.cooldown > 0 || this.hitCooldown > 0) return null;
        this.cooldown = 0.3;
        const dirVec = new Vec(Math.cos(this.turret), Math.sin(this.turret));
        const barrelLen = 10;
        const pos = this.pos.add(dirVec.mul(TANK_SIZE.h / 2 + barrelLen));
        
        if (soundEnabled && audioContext) {
            playGunshotSound();
        }
        
        return new Bullet(this.team, pos, this.turret);
    }

    draw(ctx) {
        drawTank(ctx, this);
    }

    reset() {
        const wasCarryingFlag = this.hasFlag;
        this.cooldown = 0;
        this.hitCooldown = HIT_COOLDOWN;
        this.hasFlag = false;

        if (wasCarryingFlag) {
            const oppositeTeam = this.team === 'red' ? 'blue' : 'red';
            const flag = flags[oppositeTeam];
            flag.carrier = null;
            flag.reset();
        }
    }
}

// Bullet class
class Bullet {
    constructor(team, pos, dir) {
        this.team = team;
        this.pos = pos;
        this.dir = dir;
        this.vel = new Vec(Math.cos(dir), Math.sin(dir)).mul(BULLET_SPEED);
        this.life = BULLET_LIFE;
    }

    update(dt) {
        this.pos = this.pos.add(this.vel.mul(dt));
        this.life -= dt;
    }

    draw(ctx) {
        drawBullet(ctx, this);
    }
}

// Reset flags
function resetFlags() {
    flags.red.reset();
    flags.blue.reset();
    for (const t of tanks) {
        t.hasFlag = false;
    }
    
    // Create 3D representations if using 3D
    if (use3D) {
        createFlags(flags);
        createEndzones(endzones);
    }
}

// Render 2D overlay for HUD and game over screen
function render2DOverlay(ctx, WIDTH, HEIGHT, score, round, roundTimer, gameOver, isMobile, canvasScale) {
    // Save the current context state
    ctx.save();
    
    // Apply scaling if on mobile
    if (isMobile && canvasScale !== 1) {
        ctx.scale(canvasScale, canvasScale);
    }
    
    // Clear the canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Game over screen
    if (gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, isMobile ? ctx.canvas.width : WIDTH, isMobile ? ctx.canvas.height : HEIGHT);
        ctx.fillStyle = 'white';
        ctx.font = '48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${score.red > score.blue ? 'Red' : 'Blue'} Wins!`, 
                    isMobile ? ctx.canvas.width/2 : WIDTH/2, 
                    isMobile ? ctx.canvas.height/2 : HEIGHT/2);
    }
    
    // Restore the context state
    ctx.restore();
}

// Main update function
function update(dt) {
    // update tanks
    for (const t of tanks) {
        if (t === tanks[0]) { // human player
            if (isMobile()) {
                if (leftJoystick.active) {
                    t.speed = TANK_SPEED * leftJoystick.y;
                    if (Math.abs(leftJoystick.x) > 0.1) {
                        t.turn = -leftJoystick.x;
                    } else {
                        t.turn = 0;
                    }
                } else {
                    t.speed = 0;
                    t.turn = 0;
                }
                
                // Mobile firing
                if (fireButton.active) {
                    console.log("Fire button is active, attempting to fire");
                    const bullet = t.fire();
                    if (bullet) {
                        console.log("Bullet fired successfully");
                        bullets.push(bullet);
                    } else {
                        console.log("Bullet not fired (cooldown or hit cooldown active)");
                        console.log("Cooldown:", t.cooldown, "Hit cooldown:", t.hitCooldown);
                    }
                }
            } else {
                // Desktop controls
                t.speed = 0;
                if (keys['w'] || keys['ArrowUp']) t.speed += TANK_SPEED;
                if (keys['s'] || keys['ArrowDown']) t.speed -= TANK_SPEED;
                t.turn = 0;
                if (keys['a'] || keys['ArrowLeft']) t.turn = -1;
                if (keys['d'] || keys['ArrowRight']) t.turn = 1;
                
                // Desktop firing (mouse click or spacebar)
                if (mouse.clicked || keys[' ']) {
                    const bullet = t.fire();
                    if (bullet) bullets.push(bullet);
                }
            }
        }
        t.update(dt);
    }

    // Reset mouse click state AFTER processing
    if (!isMobile() && mouse.clicked) {
        mouse.clicked = false;
    }

    // update AI
    const newBullets = aiUpdate(dt, tanks, flags, endzones, WALLS);
    if (newBullets) bullets.push(...newBullets);

    // update bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.update(dt);
        
        // Remove bullets that are out of life or bounds
        if (b.life <= 0 || 
            b.pos.x < 0 || b.pos.x > WIDTH || 
            b.pos.y < 0 || b.pos.y > HEIGHT) {
            bullets.splice(i, 1);
            continue;
        }
    }

    // collisions
    for (const b of bullets) {
        // walls
        for (const w of WALLS) {
            if (rectCircleColl(w, b.pos, BULLET_RADIUS + 2)) {  // Slightly larger collision radius
                b.life = 0; 
                break;
            }
        }
        if (b.life <= 0) continue;
        
        // tanks
        for (const t of tanks) {
            if (t.team === b.team || t.hitCooldown > 0) continue;
            const tankRect = {
                x: t.pos.x - TANK_SIZE.w / 2,
                y: t.pos.y - TANK_SIZE.h / 2,
                w: TANK_SIZE.w,
                h: TANK_SIZE.h
            };
            if (rectCircleColl(tankRect, b.pos, BULLET_RADIUS)) {
                b.life = 0;
                t.reset();
                break;
            }
        }
    }

    // flag pickup
    for (const f of Object.values(flags)) {
        if (f.carrier) continue;
        for (const t of tanks) {
            if (t.hasFlag || t.hitCooldown > 0) continue;
            if (t.team === f.team) continue;
            if (circleCircleColl(t.pos, Math.max(TANK_SIZE.w, TANK_SIZE.h) / 2, f.pos, FLAG_RADIUS)) {
                f.carrier = t;
                t.hasFlag = true;
                break;
            }
        }
    }

    // flag scoring
    for (const f of Object.values(flags)) {
        if (f.carrier && f.carrier.team !== f.team) {
            const zone = f.carrier.team === 'red'
                ? endzones.red.zone
                : endzones.blue.zone;

            if (rectCircleColl(zone, f.carrier.pos, FLAG_RADIUS)) {
                score[f.carrier.team]++;
                updateScoreDisplay();
                f.carrier.hasFlag = false;
                f.carrier = null;
                f.reset();
                initTanks();

                if (score.red === 2 || score.blue === 2) {
                    gameOver = true;
                }

                round++;
                roundTimer = ROUND_TIME;
                break;
            }
        }
    }

    // round timer
    roundTimer -= dt;
    if (roundTimer <= 0 && !gameOver) {
        round++;
        roundTimer = ROUND_TIME;
        initTanks();
        flags.red.reset(); 
        flags.blue.reset();
    }
    
    // Update 3D representations if using 3D
    if (use3D) {
        updateTanks(tanks);
        updateBullets(bullets);
        updateFlags(flags);
    }
    
    // Update the HUD
    updateScoreDisplay();
}

function updateScoreDisplay() {
    const scoreRed = document.getElementById('scoreRed');
    const scoreBlue = document.getElementById('scoreBlue');
    const roundElement = document.getElementById('round');
    const timeElement = document.getElementById('time');
    
    if (scoreRed) scoreRed.textContent = `Red: ${score.red}`;
    if (scoreBlue) scoreBlue.textContent = `Blue: ${score.blue}`;
    if (roundElement) roundElement.textContent = `Round ${round}`;
    if (timeElement) timeElement.textContent = Math.ceil(roundTimer);
}

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', initGame);

export { initGame };
