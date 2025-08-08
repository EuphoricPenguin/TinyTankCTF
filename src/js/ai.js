import * as utils from './utils.js';
import { TANK_SIZE } from './graphics.js';
import { WIDTH, HEIGHT, TANK_SPEED } from './constants.js';

const AI_STEP = 0.10; // planning frequency
const MAX_DIST = 9999; // "very far"
const RANGE = 250; // max engagement range
const WALL_AVOID = 45; // safety margin vs walls (px)

let aiLast = 0;

function aiUpdate(dt, tanks, flags, endzones, WALLS) {
    aiLast += dt;
    if (aiLast < AI_STEP / 2) return null; // Check more frequently
    aiLast = 0;
    
    const bulletsFired = [];

    // Process AI tanks (all except first tank which is human player)
    for (const bot of tanks.slice(1)) {
        if (bot.hitCooldown > 0) continue;

        // Find closest enemy
        let closestEnemy = null;
        let closestDist = Infinity;
        for (const t of tanks) {
            if (t.team === bot.team || t.hitCooldown > 0) continue;
            const dist = bot.pos.sub(t.pos).len();
            if (dist < closestDist && utils.hasLineOfSight(bot.pos, t.pos, WALLS)) {
                closestDist = dist;
                closestEnemy = t;
            }
        }

        if (closestEnemy && closestDist < RANGE) {
            // Aim at enemy
            const dx = closestEnemy.pos.x - bot.pos.x;
            const dy = closestEnemy.pos.y - bot.pos.y;
            bot.turret = Math.atan2(dy, dx);

            // Fire if aligned (within 30 degrees)
            const angleDiff = Math.abs(utils.normalizeAngle(bot.turret - Math.atan2(dy, dx)));
            if (angleDiff < Math.PI / 6) {
                const bullet = bot.fire();
                if (bullet) bulletsFired.push(bullet);
            }
        }
    }

    // Process AI tanks: all tanks except the first red tank (which is human player)
    tanks.slice(1).forEach(bot => {
        if (bot.hitCooldown > 0) return;

        // Define enemy team and target flag based on bot team
        const enemyTeam = bot.team === 'red' ? 'blue' : 'red';
        const enemyFlag = flags[enemyTeam];
        const ownEndzone = endzones[bot.team].zone;

        // Flag logic
        let goal = null;
        if (bot.hasFlag) {
            // If carrying flag, head to own endzone
            goal = new utils.Vec(ownEndzone.x + ownEndzone.w / 2,
                ownEndzone.y + ownEndzone.h / 2);
        } else if (enemyFlag && !enemyFlag.carrier) {
            // If enemy flag is available, go for it
            goal = enemyFlag.pos.clone();
        }

        // Find closest enemy
        let closestEnemy = null;
        let closestDist = Infinity;
        for (const t of tanks) {
            if (t.team === bot.team || t.hitCooldown > 0) continue;
            const dist = bot.pos.sub(t.pos).len();
            if (dist < closestDist && utils.hasLineOfSight(bot.pos, t.pos, WALLS)) {
                closestDist = dist;
                closestEnemy = t;
            }
        }

        if (closestEnemy) {
            // Always aim at enemy
            const dx = closestEnemy.pos.x - bot.pos.x;
            const dy = closestEnemy.pos.y - bot.pos.y;
            bot.turret = Math.atan2(dy, dx);

            // Fire if aligned
            const angleDiff = Math.abs(utils.normalizeAngle(bot.turret - Math.atan2(dy, dx)));
            if (angleDiff < Math.PI / 6) { // ~30 degree firing arc
                const b = bot.fire();
                if (b) return b;
            }

            // Movement adjustments
            if (!goal) {
                if (closestDist < 150) {
                    bot.speed = -TANK_SPEED; // Back up when too close
                } else if (closestDist > 200) {
                    bot.speed = TANK_SPEED; // Approach when far
                } else {
                    bot.speed = TANK_SPEED * 0.5; // Strafe when at medium range
                    bot.turn = Math.random() > 0.5 ? 1 : -1;
                }
                return;
            }
        }

        // Default movement to goal (if exists)
        if (goal) {
            const desired = goal.sub(bot.pos).norm();
            let angle = utils.clampAngle(Math.atan2(desired.y, desired.x));
            const ray = desired.mul(WALL_AVOID);
            const pr = {
                x: bot.pos.x + ray.x - TANK_SIZE.w / 2,
                y: bot.pos.y + ray.y - TANK_SIZE.h / 2,
                w: TANK_SIZE.w, h: TANK_SIZE.h
            };
            let steerAngle = 0;
            for (let w of WALLS) {
                if (utils.rectRectColl(pr, w)) {
                    let dx = goal.x - (w.x + w.w / 2),
                        dy = goal.y - (w.y + w.h / 2);
                    steerAngle = Math.atan2(dy, dx) + Math.PI / 2;
                    break;
                }
            }
            if (pr.x < 0 || pr.x + pr.w > WIDTH || pr.y < 0 || pr.y + pr.h > HEIGHT) {
                const mid = new utils.Vec(WIDTH / 2, HEIGHT / 2);
                steerAngle = Math.atan2(mid.y - bot.pos.y, mid.x - bot.pos.x);
            }
            angle = steerAngle || angle;
            const diff = utils.normalizeAngle(angle - bot.dir);
            bot.turn = diff > 0.10 ? 1 : diff < -0.10 ? -1 : 0;
            bot.speed = TANK_SPEED;
        } else {
            // If no goal, wander
            if (Math.random() < 0.02) { // Occasionally change direction
                bot.turn = Math.random() > 0.5 ? 1 : -1;
            }
            bot.speed = TANK_SPEED * 0.7; // Move at reduced speed when no goal
        }
    });
    
    return bulletsFired.length > 0 ? bulletsFired : null;
}

function tryFire(bot, target) {
    if (bot.cooldown > 0) return;

    // Calculate angle difference between turret and target
    const desiredAngle = Math.atan2(target.pos.y - bot.pos.y, target.x - bot.pos.x);
    const angleDiff = Math.abs(utils.normalizeAngle(desiredAngle - bot.turret));

    // Fire if reasonably aimed at target (within 15 degrees)
    if (angleDiff < Math.PI / 12) {  // ~15 degrees
        const b = bot.fire();
        if (b) bulletsFired.push(b);
    }
}

export { aiUpdate, tryFire };