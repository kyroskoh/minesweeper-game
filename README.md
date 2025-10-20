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
   http://localhost:3030
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
- **Database**: SQLite (sql.js) for persistent leaderboard storage
- **Game Logic**: Object-oriented JavaScript class

## Database

The leaderboard scores are stored in `leaderboard.db` (SQLite database). The database is automatically created on first run and includes:
- Player names
- Completion times
- Difficulty levels
- Timestamps

Top 10 scores for each difficulty level are displayed in the leaderboard.

### Adding Scores Manually

You can add scores manually using the helper script:

```bash
# Using npm script
npm run add-score "Player Name" <time> <difficulty> [date]

# Or directly
node scripts/add-score.js "Player Name" <time> <difficulty> [date]
```

**Examples:**
```bash
# Time in seconds (uses today's date)
npm run add-score "John Doe" 45 Easy

# Time in mm:ss format (uses today's date)
npm run add-score "Jane Smith" 3:45 Medium

# Time in h:mm:ss format with custom date
npm run add-score "Pro Gamer" 1:23:45 Expert "2025-10-15"

# With different date format
npm run add-score "Speed Runner" 2:30 Hard "10/15/2025"
```

**Valid difficulties:** Easy, Medium, Hard, Expert, Extreme

**Time formats:**
- Seconds: `45` (stored as 45 seconds)
- mm:ss: `3:45` (stored as 225 seconds)
- h:mm:ss: `1:23:45` (stored as 5025 seconds)

**Date formats (optional):**
- ISO: `2025-10-20`
- US: `10/20/2025`
- Any valid date string recognized by JavaScript
- If omitted, uses today's date

The script will:
- ✅ Validate the time format
- ✅ Convert time to seconds for storage
- ✅ Validate the date if provided
- ✅ Show the top 5 scores after adding

Enjoy playing Minesweeper! 💣
