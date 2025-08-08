class Vec {
    constructor(x, y) { this.x = x; this.y = y; }
    add(v) { return new Vec(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vec(this.x - v.x, this.y - v.y); }
    mul(s) { return new Vec(this.x * s, this.y * s); }
    div(s) { return new Vec(this.x / s, this.y / s); }
    len() { return Math.hypot(this.x, this.y); }
    norm() { let l = this.len(); return l ? new Vec(this.x / l, this.y / l) : new Vec(0, 0); }
    dot(v) { return this.x * v.x + this.y * v.y; }
    clone() { return new Vec(this.x, this.y); }
}

function rectCircleColl(r, c, cr) {
    let closestX = Math.max(r.x, Math.min(c.x, r.x + r.w));
    let closestY = Math.max(r.y, Math.min(c.y, r.y + r.h));
    let dx = c.x - closestX, dy = c.y - closestY;
    return (dx * dx + dy * dy) <= cr * cr;
}

function circleCircleColl(c1, r1, c2, r2) {
    let d = Math.hypot(c1.x - c2.x, c1.y - c2.y);
    return d <= r1 + r2;
}

function rectRectColl(r1, r2) {
    return r1.x < r2.x + r2.w &&
        r1.x + r1.w > r2.x &&
        r1.y < r2.y + r2.h &&
        r1.y + r1.h > r2.y;
}

function clampAngle(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
}

function normalizeAngle(a) {
    return clampAngle(a);
}

function hasLineOfSight(p1, p2, walls) {
    for (let w of walls) {
        if (lineIntersectsRect(p1, p2, w)) return false;
    }
    return true;
}

function lineIntersectsRect(a, b, r) {
    const x1 = a.x, y1 = a.y, x2 = b.x, y2 = b.y;
    const left = r.x, right = r.x + r.w, top = r.y, bottom = r.y + r.h;

    // Liang–Barsky clipping
    let t0 = 0, t1 = 1, dx = x2 - x1, dy = y2 - y1;
    let p = [-dx, dx, -dy, dy];
    let q = [x1 - left, right - x1, y1 - top, bottom - y1];
    for (let i = 0; i < 4; i++) {
        if (p[i] === 0) { if (q[i] < 0) return false; }
        let t = q[i] / p[i];
        if (p[i] < 0) { if (t > t1) return false; else t0 = Math.max(t, t0); }
        else { if (t < t0) return false; else t1 = Math.min(t, t1); }
    }
    return (t0 <= t1 && t0 >= 0 && t0 <= 1);
}

export { 
    Vec, 
    rectCircleColl, 
    circleCircleColl, 
    rectRectColl, 
    clampAngle, 
    normalizeAngle, 
    hasLineOfSight, 
    lineIntersectsRect 
};
