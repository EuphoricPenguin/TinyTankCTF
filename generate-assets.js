

const fs = require('fs');
const path = require('path');

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)){
    fs.mkdirSync(assetsDir);
}

// Create simple placeholder images
const createPlaceholder = (filename, color) => {
    const content = `
        <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="${color}" />
        </svg>
    `;
    fs.writeFileSync(path.join(assetsDir, filename), content);
};

// Generate placeholder assets
createPlaceholder('tank.png', '#ff0000'); // Red for tank
createPlaceholder('turret.png', '#0000ff'); // Blue for turret
createPlaceholder('bullet.png', '#ffff00'); // Yellow for bullet
createPlaceholder('flag.png', '#00ff00'); // Green for flag

console.log('Generated placeholder assets');

