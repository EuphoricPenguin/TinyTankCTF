
# Capture The Flag Game

A simple Capture The Flag game implemented with Phaser.js.

## Features

- Two teams (red and blue tanks)
- Flag capture mechanics
- Scoring system
- Round reset functionality
- Tank shooting and destruction

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Steps

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/ctf-game.git
   cd ctf-game
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Generate placeholder assets:**

   ```bash
   node generate-assets.js
   ```

## Running the Game

### Development Mode

1. **Start the development server:**

   ```bash
   npm start
   ```

2. **Open your browser and navigate to:**

   ```
   http://localhost:8080
   ```

### Production Mode

1. **Build the game:**

   ```bash
   npm run build
   ```

2. **Start the production server:**

   ```bash
   npm run serve
   ```

3. **Open your browser and navigate to:**

   ```
   http://localhost:8080
   ```

## Game Controls

- **Player 1 (Red Team):**
  - W: Move Up
  - A: Move Left
  - S: Move Down
  - D: Move Right
  - Space: Shoot

- **Player 2 (Blue Team):**
  - Arrow Up: Move Up
  - Arrow Left: Move Left
  - Arrow Down: Move Down
  - Arrow Right: Move Right
  - Shift: Shoot

## Game Mechanics

- Each tank has 100 health points
- Bullets deal 20 damage per hit
- Capture the enemy flag to score points
- The game resets after each round

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
