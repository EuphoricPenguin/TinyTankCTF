let mouse = { x: 0, y: 0, clicked: false };
const keys = {};

// Mobile controls state
const leftJoystick = {
    active: false,
    knob: null,
    x: 0,
    y: 0
};

const rightTouchpad = {
    active: false,
    container: null,
    indicator: null,
    centerX: 75,
    centerY: 75,
    angle: 0,
    lastFire: 0
};

const fireButton = {
    active: false,
    element: null
};

function setupControls(canvas, WIDTH, HEIGHT) {
    // Initialize mobile controls if needed
    if (isMobile()) {
        setupTouchControls();
    }

    // Keyboard controls
    window.addEventListener('keydown', e => { keys[e.key] = true; });
    window.addEventListener('keyup', e => { keys[e.key] = false; });

    // Mouse controls (desktop only)
    if (!isMobile()) {
        canvas.addEventListener('mousemove', e => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = WIDTH / rect.width;
            const scaleY = HEIGHT / rect.height;
            mouse.x = (e.clientX - rect.left) * scaleX;
            mouse.y = (e.clientY - rect.top) * scaleY;
        });
        
        canvas.addEventListener('mousedown', () => {
            mouse.clicked = true;
        });
        
        canvas.addEventListener('mouseup', () => {
            mouse.clicked = false;
        });
    }
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           (window.innerWidth <= 768);
}

function setupTouchControls() {
    leftJoystick.knob = document.querySelector('#left-joystick .knob');
    rightTouchpad.container = document.querySelector('#right-joystick .touchpad');
    rightTouchpad.indicator = document.querySelector('#right-joystick .aim-indicator');

    // Left joystick (movement)
    const leftJoyContainer = document.getElementById('left-joystick');
    leftJoyContainer.addEventListener('touchstart', handleLeftJoystickStart, {passive: false});
    leftJoyContainer.addEventListener('touchmove', handleLeftJoystickMove, {passive: false});
    leftJoyContainer.addEventListener('touchend', handleLeftJoystickEnd, {passive: false});

    // Right touchpad (aiming)
    const rightTouchPadContainer = document.getElementById('right-joystick');
    rightTouchPadContainer.addEventListener('touchstart', handleRightTouchpadStart, {passive: false});
    rightTouchPadContainer.addEventListener('touchmove', handleRightTouchpadMove, {passive: false});
    rightTouchPadContainer.addEventListener('touchend', handleRightTouchpadEnd, {passive: false});

    // Create and add fire button for mobile
    fireButton.element = document.createElement('div');
    fireButton.element.className = 'fire-button';
    fireButton.element.innerHTML = 'FIRE';
    document.body.appendChild(fireButton.element);
    
    fireButton.element.addEventListener('touchstart', handleFireButtonStart, {passive: false});
    fireButton.element.addEventListener('touchend', handleFireButtonEnd, {passive: false});
    
    // Add event for pointer events (desktop touch support)
    fireButton.element.addEventListener('pointerdown', handleFireButtonStart, {passive: false});
    fireButton.element.addEventListener('pointerup', handleFireButtonEnd, {passive: false});
    fireButton.element.addEventListener('pointercancel', handleFireButtonEnd, {passive: false});
}

// Mobile control handlers
function handleLeftJoystickStart(e) {
    e.preventDefault();
    e.stopPropagation();
    leftJoystick.active = true;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    updateJoystick(touch.clientX - rect.left, touch.clientY - rect.top);
}

function handleLeftJoystickMove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!leftJoystick.active) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    updateJoystick(touch.clientX - rect.left, touch.clientY - rect.top);
}

function handleLeftJoystickEnd(e) {
    e.preventDefault();
    e.stopPropagation();
    leftJoystick.active = false;
    resetJoystick();
}

function handleRightTouchpadStart(e) {
    e.preventDefault();
    e.stopPropagation();
    rightTouchpad.active = true;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    updateTouchpad(touch.clientX - rect.left, touch.clientY - rect.top);
}

function handleRightTouchpadMove(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!rightTouchpad.active) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    updateTouchpad(touch.clientX - rect.left, touch.clientY - rect.top);
}

function handleRightTouchpadEnd(e) {
    e.preventDefault();
    e.stopPropagation();
    rightTouchpad.active = false;
    resetTouchpad();
}

function handleFireButtonStart(e) {
    e.preventDefault();
    e.stopPropagation();
    fireButton.active = true;
    console.log("Fire button pressed");
}

function handleFireButtonEnd(e) {
    e.preventDefault();
    e.stopPropagation();
    fireButton.active = false;
    console.log("Fire button released");
}

// Joystick and touchpad helpers
function updateJoystick(x, y) {
    const centerX = 75;
    const centerY = 75;
    const maxDistance = 50;
    
    const dx = x - centerX;
    const dy = y - centerY;
    
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), maxDistance);
    const angle = Math.atan2(dy, dx);
    
    leftJoystick.x = Math.cos(angle) * (distance / maxDistance);
    leftJoystick.y = -Math.sin(angle) * (distance / maxDistance);
    
    const knobX = centerX - Math.sin(angle) * distance;
    const knobY = centerY - Math.cos(angle) * distance;
    leftJoystick.knob.style.left = `${knobX - 30}px`;
    leftJoystick.knob.style.top = `${knobY - 30}px`;
}

function resetJoystick() {
    leftJoystick.x = 0;
    leftJoystick.y = 0;
    leftJoystick.knob.style.left = '50%';
    leftJoystick.knob.style.top = '50%';
    leftJoystick.knob.style.transform = 'translate(-50%, -50%)';
}

function updateTouchpad(x, y) {
    const dx = x - rightTouchpad.centerX;
    const dy = y - rightTouchpad.centerY;
    
    rightTouchpad.angle = Math.atan2(dy, dx);
    rightTouchpad.indicator.style.transform = `translateX(-50%) rotate(${rightTouchpad.angle + Math.PI/2}rad)`;
}

function resetTouchpad() {
    rightTouchpad.angle = 0;
    rightTouchpad.indicator.style.transform = `translateX(-50%)`;
}

export { 
    setupControls, 
    mouse, 
    keys, 
    leftJoystick, 
    rightTouchpad, 
    fireButton,
    isMobile
};