
class CTFGame extends Phaser.Scene {
    constructor() {
        super({ key: 'CTFGame' });
    }

    preload() {
        // Load assets here
        console.log('Preloading assets...');

        // Load tank and turret graphics
        this.load.image('tank', 'assets/tank.png');
        this.load.image('turret', 'assets/turret.png');
        this.load.image('bullet', 'assets/bullet.png');
        this.load.image('flag', 'assets/flag.png');
    }

    create() {
        // Set up the game world
        console.log('Creating game world...');

        // Create background
        this.add.rectangle(400, 300, 800, 600, 0xeeeeee).setStrokeStyle(1, 0x000000);

        // Create grid pattern
        for (let x = 0; x <= 800; x += 50) {
            for (let y = 0; y <= 600; y += 50) {
                this.add.rectangle(x, y, 50, 50, 0xdddddd).setStrokeStyle(1, 0x000000);
            }
        }

        // Create endzones
        this.redEndzone = this.add.rectangle(750, 300, 100, 600, 0xff0000).setAlpha(0.5);
        this.blueEndzone = this.add.rectangle(50, 300, 100, 600, 0x0000ff).setAlpha(0.5);

        // Create obstacles (simple walls)
        this.obstacles = [];
        this.obstacles.push(this.add.rectangle(400, 150, 400, 20, 0x000000));
        this.obstacles.push(this.add.rectangle(400, 450, 400, 20, 0x000000));
        this.obstacles.push(this.add.rectangle(200, 300, 20, 200, 0x000000));
        this.obstacles.push(this.add.rectangle(600, 300, 20, 200, 0x000000));

        // Create flags
        this.redFlag = this.physics.add.sprite(700, 300, 'flag');
        this.redFlag.setTint(0xff0000);
        this.redFlag.setData('team', 'red');

        this.blueFlag = this.physics.add.sprite(100, 300, 'flag');
        this.blueFlag.setTint(0x0000ff);
        this.blueFlag.setData('team', 'blue');

        // Initialize game state
        this.score = { red: 0, blue: 0 };
        this.round = 1;
        this.timeLimit = 60;
        this.timeLeft = this.timeLimit;
        this.gameOver = false;

        // Initialize bullets group
        this.bullets = this.physics.add.group();

        // Create UI
        this.scoreText = this.add.text(16, 16, `Red: ${this.score.red}  Blue: ${this.score.blue}`, { fontSize: '24px', fill: '#000' });
        this.roundText = this.add.text(16, 50, `Round: ${this.round}`, { fontSize: '24px', fill: '#000' });
        this.timeText = this.add.text(16, 84, `Time: ${this.timeLeft}`, { fontSize: '24px', fill: '#000' });

        // Set up input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };

        // Initialize players and AI
        this.initializeTeams();

        // Set up collision detection
        this.physics.add.collider(this.players.red, this.obstacles);
        this.physics.add.collider(this.players.blue, this.obstacles);
        this.physics.add.collider(this.players.red, this.players.blue);

        // Flag capture
        this.physics.add.overlap(this.players.red, this.blueFlag, this.captureFlag, null, this);
        this.physics.add.overlap(this.players.blue, this.redFlag, this.captureFlag, null, this);

        // Endzone capture
        this.physics.add.overlap(this.players.red, this.blueEndzone, this.scorePoint, null, this);
        this.physics.add.overlap(this.players.blue, this.redEndzone, this.scorePoint, null, this);

        // Bullet collision with tanks
        this.physics.add.overlap(this.players.red, this.bullets, this.hitByBullet, null, this);
        this.physics.add.overlap(this.players.blue, this.bullets, this.hitByBullet, null, this);
    }

    update(time, delta) {
        if (this.gameOver) return;

        // Update timer
        this.timeLeft -= delta / 1000;
        this.timeText.setText(`Time: ${Math.ceil(this.timeLeft)}`);

        if (this.timeLeft <= 0) {
            this.endRound();
        }

        // Update player movement and AI
        this.updatePlayers(time, delta);
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: CTFGame
};

const game = new Phaser.Game(config);

function initializeTeams() {
    // Initialize player tanks
    this.players = {
        red: [],
        blue: []
    };

    // Red team (AI + player)
    for (let i = 0; i < 3; i++) {
        this.players.red.push(this.createTank(100 + i * 50, 100 + i * 50, 'red', i === 0 ? 'player' : 'ai'));
    }

    // Blue team (AI + player)
    for (let i = 0; i < 3; i++) {
        this.players.blue.push(this.createTank(700 - i * 50, 500 - i * 50, 'blue', i === 0 ? 'player' : 'ai'));
    }
}

function updateTank(tank, time, delta) {
    const controlType = tank.getData('controlType');
    const speed = tank.getData('speed');
    const team = tank.getData('team');
    let cursors = this.cursors;
    let wasd = this.wasd;

    // Update turret rotation to follow mouse
    const pointer = this.input.activePointer;
    const angle = Phaser.Math.Angle.Between(tank.x, tank.y, pointer.x, pointer.y);
    tank.turret.rotation = angle;

    // Handle shooting
    if (controlType === 'player') {
        if (team === 'red' && Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
            team === 'blue' && Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT))) {

            const lastFired = tank.getData('lastFired');
            const fireRate = tank.getData('fireRate');
            if (time > lastFired + fireRate) {
                this.shootBullet(tank);
                tank.setData('lastFired', time);
            }
        }
    }

    // Handle movement
    if (controlType === 'player') {
        if (team === 'red') {
            if (cursors.up.isDown || wasd.up.isDown) {
                tank.setVelocityY(-speed);
            } else if (cursors.down.isDown || wasd.down.isDown) {
                tank.setVelocityY(speed);
            } else {
                tank.setVelocityY(0);
            }

            if (cursors.left.isDown || wasd.left.isDown) {
                tank.setVelocityX(-speed);
            } else if (cursors.right.isDown || wasd.right.isDown) {
                tank.setVelocityX(speed);
            } else {
                tank.setVelocityX(0);
            }
        } else if (team === 'blue') {
            if (cursors.up.isDown) {
                tank.setVelocityY(-speed);
            } else if (cursors.down.isDown) {
                tank.setVelocityY(speed);
            } else {
                tank.setVelocityY(0);
            }

            if (cursors.left.isDown) {
                tank.setVelocityX(-speed);
            } else if (cursors.right.isDown) {
                tank.setVelocityX(speed);
            } else {
                tank.setVelocityX(0);
            }
        }
    } else {
        // Simple AI movement (random)
        if (Math.random() < 0.01) {
            tank.setVelocityX(Phaser.Math.Between(-speed, speed));
            tank.setVelocityY(Phaser.Math.Between(-speed, speed));
        }
    }

    // Keep tanks within bounds
    if (tank.x < 25) tank.x = 25;
    if (tank.x > 775) tank.x = 775;
    if (tank.y < 25) tank.y = 25;
    if (tank.y > 575) tank.y = 575;

    // Update turret position
    tank.turret.x = tank.x;
    tank.turret.y = tank.y;
}

function createTank(x, y, team, controlType) {
    const tank = this.physics.add.sprite(x, y, 'tank');
    tank.setData('team', team);
    tank.setData('controlType', controlType);
    tank.setData('speed', 150);
    tank.setData('health', 100);
    tank.setData('fireRate', 500); // ms between shots
    tank.setData('lastFired', 0);
    tank.setData('hasFlag', false);

    // Create turret
    tank.turret = this.add.sprite(x, y, 'turret');
    tank.turret.setData('parent', tank);

    // Set team color
    if (team === 'red') {
        tank.setTint(0xff0000);
        tank.turret.setTint(0xff0000);
    } else if (team === 'blue') {
        tank.setTint(0x0000ff);
        tank.turret.setTint(0x0000ff);
    }

    return tank;
}function shootBullet(tank) {
    const bullet = this.physics.add.sprite(tank.x, tank.y, 'bullet');
    bullet.setData('team', tank.getData('team'));
    bullet.setData('speed', 300);
    bullet.setVelocityFromRotation(tank.turret.rotation, 300);

    // Add to bullets group
    this.bullets.add(bullet);

    // Add collision and cleanup
    this.physics.add.collider(bullet, this.obstacles, (b, w) => {
        b.destroy();
    });

    this.time.addEvent({
        delay: 2000, // Bullets live for 2 seconds
        callback: () => {
            if (bullet.active) {
                bullet.destroy();
            }
        }
    });
}

function hitByBullet(tank, bullet) {
    const bulletTeam = bullet.getData('team');
    const tankTeam = tank.getData('team');

    // Only damage if bullet is from opposite team
    if (bulletTeam !== tankTeam) {
        // Damage the tank
        const health = tank.getData('health');
        tank.setData('health', health - 25);

        // Destroy bullet
        bullet.destroy();

        // Check if tank is destroyed
        if (health <= 25) {
            // Tank destroyed - reset position
            if (tankTeam === 'red') {
                tank.setPosition(100 + Math.random() * 100, 100 + Math.random() * 100);
            } else {
                tank.setPosition(700 - Math.random() * 100, 500 - Math.random() * 100);
            }
            tank.setData('health', 100);
            tank.setData('hasFlag', false);
            tank.setData('carryingFlag', null);

            // Drop flag if carrying one
            if (tank.getData('hasFlag')) {
                const flagTeam = tank.getData('carryingFlag');
                if (flagTeam === 'red') {
                    this.redFlag.setPosition(tank.x, tank.y);
                    this.redFlag.setVisible(true);
                } else {
                    this.blueFlag.setPosition(tank.x, tank.y);
                    this.blueFlag.setVisible(true);
                }
            }
        }
    }
}

function endRound() {
    // Determine winner and update score
    const redFlags = this.players.red.filter(t => t.hasFlag);
    const blueFlags = this.players.blue.filter(t => t.hasFlag);

    if (redFlags.length > blueFlags.length) {
        this.score.red++;
        this.add.text(400, 300, 'Red team wins!', { fontSize: '32px', fill: '#ff0000' });
    } else if (blueFlags.length > redFlags.length) {
        this.score.blue++;
        this.add.text(400, 300, 'Blue team wins!', { fontSize: '32px', fill: '#0000ff' });
    } else {
        this.add.text(400, 300, 'Draw!', { fontSize: '32px', fill: '#000000' });
    }

    this.gameOver = true;

    // Update UI
    this.scoreText.setText(`Red: ${this.score.red}  Blue: ${this.score.blue}`);
    this.roundText.setText(`Round: ${this.round}`);

    // Reset for next round after 3 seconds
    this.time.addEvent({
        delay: 3000,
        callback: () => {
            this.resetRound();
        }
    });
}

function captureFlag(tank, flag) {
    if (tank.getData('hasFlag')) return; // Already carrying a flag

    // Tank captures the flag
    tank.setData('hasFlag', true);
    tank.setData('carryingFlag', flag.getData('team'));

    // Hide the flag
    flag.setVisible(false);

    // Update UI
    this.add.text(tank.x, tank.y - 20, `Captured ${flag.getData('team')} flag!`, { fontSize: '16px', fill: '#000' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1000)
        .setAlpha(0.8);
}

function scorePoint(tank, endzone) {
    const flagTeam = tank.getData('carryingFlag');
    if (!flagTeam) return; // No flag being carried

    // Check if the tank is returning the right flag to the right endzone
    if ((flagTeam === 'red' && endzone === this.redEndzone) ||
        (flagTeam === 'blue' && endzone === this.blueEndzone)) {

        // Score a point
        if (flagTeam === 'red') {
            this.score.blue++;
        } else {
            this.score.red++;
        }

        // Update score UI
        this.scoreText.setText(`Red: ${this.score.red}  Blue: ${this.score.blue}`);

        // Reset flag position
        if (flagTeam === 'red') {
            this.redFlag.setPosition(700, 300);
        } else {
            this.blueFlag.setPosition(100, 300);
        }
        this.redFlag.setVisible(true);
        this.blueFlag.setVisible(true);

        // Reset tank flag state
        tank.setData('hasFlag', false);
        tank.setData('carryingFlag', null);

        // Check if round should end
        if (this.score.red >= 3 || this.score.blue >= 3) {
            this.endRound();
        }
    }
}

function resetRound() {

    this.gameOver = false;
    this.timeLeft = this.timeLimit;
    this.round++;

    // Reset player positions and flags
    this.players.red.forEach(tank => {
        tank.x = 100 + Math.random() * 100;
        tank.y = 100 + Math.random() * 100;
        tank.setData('hasFlag', false);
        tank.setData('carryingFlag', null);
    });

    this.players.blue.forEach(tank => {
        tank.x = 700 - Math.random() * 100;
        tank.y = 500 - Math.random() * 100;
        tank.setData('hasFlag', false);
        tank.setData('carryingFlag', null);
    });

    // Reset flags
    this.redFlag.setVisible(true);
    this.blueFlag.setVisible(true);
    this.redFlag.setPosition(700, 300);
    this.blueFlag.setPosition(100, 300);

    // Update UI
    this.timeText.setText(`Time: ${Math.ceil(this.timeLeft)}`);
    this.roundText.setText(`Round: ${this.round}`);
}
