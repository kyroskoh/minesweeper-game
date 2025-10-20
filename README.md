# Minesweeper Game

A classic Minesweeper game built with a Node.js/Express backend and vanilla JavaScript frontend.

## Features

- **Five difficulty levels**: Easy (8x8, 10 mines), Medium (10x10, 15 mines), Hard (15x15, 35 mines), Expert (18x18, 60 mines), Extreme (20x20, 80 mines)
- **Classic gameplay**: Left-click to reveal cells, right-click to place flags
- **Auto-reveal**: Empty cells automatically reveal adjacent cells
- **Win detection**: Complete the game by revealing all non-mine cells
- **Timer**: Track your completion time (starts on first move)
- **Leaderboard**: Compare your best times with others for each difficulty level
- **Responsive design**: Clean, modern UI with gradient background

## Project Structure

```
minesweeper/
├── backend/
│   └── server.js       # Express server with game logic
├── public/
│   ├── index.html      # Frontend HTML
│   ├── style.css       # Styling
│   └── app.js          # Frontend JavaScript
├── package.json        # Dependencies
└── README.md           # This file
```

## Installation

1. Make sure you have Node.js installed
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Game

1. Start the server:
   ```bash
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

3. Start playing!

## How to Play

- **Left Click**: Reveal a cell
- **Right Click**: Place or remove a flag
- **Goal**: Reveal all cells that don't contain mines as fast as possible
- **Timer**: Starts when you reveal your first cell
- **Leaderboard**: Win the game to save your time and compete with others

## API Endpoints

### Game Endpoints
- `POST /api/game/new` - Create a new game
  - Body: `{ rows, cols, mines }`
  - Returns: Game ID and initial state

- `POST /api/game/:gameId/reveal` - Reveal a cell
  - Body: `{ row, col }`
  - Returns: Updated game state

- `POST /api/game/:gameId/flag` - Toggle flag on a cell
  - Body: `{ row, col }`
  - Returns: Updated game state

- `GET /api/game/:gameId` - Get current game state

### Leaderboard Endpoints
- `POST /api/leaderboard` - Submit a score
  - Body: `{ name, time, difficulty }`
  - Returns: Confirmation and entry

- `GET /api/leaderboard/:difficulty` - Get top 10 scores for a difficulty
  - Returns: Array of leaderboard entries

- `GET /api/leaderboard` - Get all leaderboards grouped by difficulty
  - Returns: Object with leaderboards for each difficulty

## Technologies Used

- **Backend**: Node.js, Express, CORS
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Game Logic**: Object-oriented JavaScript class

Enjoy playing Minesweeper! 💣
