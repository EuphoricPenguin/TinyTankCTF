import { WIDTH, HEIGHT } from './constants.js';

const TEAM_COLORS = { red: '#e74c3c', blue: '#3498db' };
const TANK_SIZE = { w: 30, h: 20 };
const BULLET_RADIUS = 3;
const FLAG_RADIUS = 8;
const ENDZONE_W = 80, ENDZONE_H = 120;
const WALLS = [
    { x: WIDTH / 2 - 150, y: HEIGHT / 2 - 50, w: 300, h: 20 },
    { x: WIDTH / 2 - 150, y: HEIGHT / 2 + 30, w: 300, h: 20 }
];

function render(ctx, WIDTH, HEIGHT, tanks, bullets, flags, endzones, score, round, roundTimer, gameOver, isMobile, canvasScale) {
    // Save the current context state
    ctx.save();
    
    // Apply scaling if on mobile
    if (isMobile && canvasScale !== 1) {
        ctx.scale(canvasScale, canvasScale);
    }
    
    // Clear and draw
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (isMobile) {
        ctx.scale(canvasScale, canvasScale);
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
    } else {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
    
    // background grid
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    for (let x = 0; x <= WIDTH; x += 20) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
    }
    for (let y = 0; y <= HEIGHT; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
    }

    // walls
    ctx.fillStyle = '#666';
    for (const w of WALLS) {
        ctx.fillRect(w.x, w.y, w.w, w.h);
    }

    // endzones
    endzones.red.draw(ctx); 
    endzones.blue.draw(ctx);

    // flags
    flags.red.draw(ctx); 
    flags.blue.draw(ctx);

    // tanks
    for (const t of tanks) t.draw(ctx);

    // bullets
    for (const b of bullets) b.draw(ctx);
    
    // Restore the context state
    ctx.restore();

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
}

// Tank drawing method
function drawTank(ctx, tank) {
    // Calculate transparency based on hit cooldown
    let alpha = 1.0;
    if (tank.hitCooldown > 0) {
        const flashIntensity = Math.sin(tank.flashTimer * 10) * 0.5 + 0.5;
        alpha = 0.3 + flashIntensity * 0.7;
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(tank.pos.x, tank.pos.y);
    ctx.rotate(tank.dir);

    /* ----- body ----- */
    ctx.fillStyle = TEAM_COLORS[tank.team];
    ctx.fillRect(-TANK_SIZE.w / 2, -TANK_SIZE.h / 2, TANK_SIZE.w, TANK_SIZE.h);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.strokeRect(-TANK_SIZE.w / 2, -TANK_SIZE.h / 2, TANK_SIZE.w, TANK_SIZE.h);

    /* ----- turret ----- */
    ctx.rotate(tank.turret - tank.dir + Math.PI / 2);
    ctx.fillStyle = 'black';
    ctx.fillRect(-8, -TANK_SIZE.h / 2, 16, TANK_SIZE.h);

    /* ----- barrel ----- */
    const barrelLen = 10;
    ctx.fillStyle = 'black';
    ctx.fillRect(-3, -TANK_SIZE.h / 2 - barrelLen, 6, barrelLen);

    ctx.restore();

    /* ----- flag carrier marker ----- */
    if (tank.hasFlag && tank.hitCooldown <= 0) {
        ctx.beginPath();
        ctx.arc(tank.pos.x, tank.pos.y - 20, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'gold';
        ctx.fill();
    }
}

// Bullet drawing method
function drawBullet(ctx, bullet) {
    ctx.beginPath();
    ctx.arc(bullet.pos.x, bullet.pos.y, BULLET_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'black';
    ctx.fill();
}

// Flag drawing method
function drawFlag(ctx, flag) {
    const drawPos = flag.carrier ? flag.carrier.pos : flag.pos;
    ctx.beginPath();
    ctx.arc(drawPos.x, drawPos.y, FLAG_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = 'gold';
    ctx.fill();
    ctx.strokeStyle = 'black'; 
    ctx.lineWidth = 1; 
    ctx.stroke();
}

// Endzone drawing method
function drawEndzone(ctx, endzone) {
    ctx.fillStyle = TEAM_COLORS[endzone.team];
    ctx.globalAlpha = 0.3;
    ctx.fillRect(endzone.zone.x, endzone.zone.y, endzone.zone.w, endzone.zone.h);
    ctx.globalAlpha = 1;
}

export { 
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
};