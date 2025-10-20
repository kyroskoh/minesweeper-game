const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3030;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Store games in memory (in production, use a database)
const games = new Map();
const leaderboard = [];

// Difficulty names
const difficultyNames = {
  '8-8-10': 'Easy',
  '10-10-15': 'Medium',
  '15-15-35': 'Hard',
  '18-18-60': 'Expert',
  '20-20-80': 'Extreme'
};

// Game class
class MinesweeperGame {
  constructor(rows = 10, cols = 10, mines = 15) {
    this.rows = rows;
    this.cols = cols;
    this.minesCount = mines;
    this.board = [];
    this.revealed = [];
    this.flags = [];
    this.gameOver = false;
    this.won = false;
    this.startTime = null;
    this.endTime = null;
    this.firstMove = true;
    this.initializeBoard();
  }

  initializeBoard() {
    // Initialize empty board
    for (let i = 0; i < this.rows; i++) {
      this.board[i] = [];
      this.revealed[i] = [];
      this.flags[i] = [];
      for (let j = 0; j < this.cols; j++) {
        this.board[i][j] = 0;
        this.revealed[i][j] = false;
        this.flags[i][j] = false;
      }
    }

    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < this.minesCount) {
      const row = Math.floor(Math.random() * this.rows);
      const col = Math.floor(Math.random() * this.cols);
      
      if (this.board[row][col] !== -1) {
        this.board[row][col] = -1; // -1 represents a mine
        minesPlaced++;
      }
    }

    // Calculate numbers for non-mine cells
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.board[i][j] !== -1) {
          this.board[i][j] = this.countAdjacentMines(i, j);
        }
      }
    }
  }

  countAdjacentMines(row, col) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        const newRow = row + i;
        const newCol = col + j;
        if (this.isValidCell(newRow, newCol) && this.board[newRow][newCol] === -1) {
          count++;
        }
      }
    }
    return count;
  }

  isValidCell(row, col) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  revealCell(row, col) {
    if (this.gameOver || !this.isValidCell(row, col) || this.revealed[row][col] || this.flags[row][col]) {
      return { success: false };
    }

    // Start timer on first move
    if (this.firstMove) {
      this.startTime = Date.now();
      this.firstMove = false;
    }

    this.revealed[row][col] = true;

    // Hit a mine
    if (this.board[row][col] === -1) {
      this.gameOver = true;
      this.endTime = Date.now();
      this.revealAllMines();
      return { success: true, gameOver: true, won: false };
    }

    // If cell is empty (0), reveal adjacent cells
    if (this.board[row][col] === 0) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (i === 0 && j === 0) continue;
          const newRow = row + i;
          const newCol = col + j;
          if (this.isValidCell(newRow, newCol) && !this.revealed[newRow][newCol]) {
            this.revealCell(newRow, newCol);
          }
        }
      }
    }

    // Check if won
    if (this.checkWin()) {
      this.gameOver = true;
      this.won = true;
      this.endTime = Date.now();
      return { success: true, gameOver: true, won: true };
    }

    return { success: true, gameOver: false };
  }

  revealAllMines() {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.board[i][j] === -1) {
          this.revealed[i][j] = true;
        }
      }
    }
  }

  toggleFlag(row, col) {
    if (this.gameOver || !this.isValidCell(row, col) || this.revealed[row][col]) {
      return { success: false };
    }

    this.flags[row][col] = !this.flags[row][col];
    return { success: true };
  }

  checkWin() {
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        // If a non-mine cell is not revealed, game is not won
        if (this.board[i][j] !== -1 && !this.revealed[i][j]) {
          return false;
        }
      }
    }
    return true;
  }

  getGameState() {
    const elapsedTime = this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0;
    return {
      rows: this.rows,
      cols: this.cols,
      revealed: this.revealed,
      flags: this.flags,
      values: this.revealed.map((row, i) => 
        row.map((isRevealed, j) => 
          isRevealed ? this.board[i][j] : null
        )
      ),
      gameOver: this.gameOver,
      won: this.won,
      minesCount: this.minesCount,
      elapsedTime: elapsedTime,
      startTime: this.startTime
    };
  }

  getFinalTime() {
    if (this.startTime && this.endTime) {
      return Math.floor((this.endTime - this.startTime) / 1000);
    }
    return 0;
  }
}

// API Endpoints
app.post('/api/game/new', (req, res) => {
  const { rows = 10, cols = 10, mines = 15 } = req.body;
  const gameId = Date.now().toString();
  const game = new MinesweeperGame(rows, cols, mines);
  games.set(gameId, game);
  
  res.json({
    gameId,
    state: game.getGameState()
  });
});

app.post('/api/game/:gameId/reveal', (req, res) => {
  const { gameId } = req.params;
  const { row, col } = req.body;
  
  const game = games.get(gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const result = game.revealCell(row, col);
  res.json({
    ...result,
    state: game.getGameState()
  });
});

app.post('/api/game/:gameId/flag', (req, res) => {
  const { gameId } = req.params;
  const { row, col } = req.body;
  
  const game = games.get(gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const result = game.toggleFlag(row, col);
  res.json({
    ...result,
    state: game.getGameState()
  });
});

app.get('/api/game/:gameId', (req, res) => {
  const { gameId } = req.params;
  const game = games.get(gameId);
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  res.json({
    state: game.getGameState()
  });
});

app.post('/api/leaderboard', (req, res) => {
  const { name, time, difficulty } = req.body;
  
  if (!name || !time || !difficulty) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const entry = {
    name: name.substring(0, 20), // Limit name length
    time,
    difficulty,
    date: new Date().toISOString()
  };

  leaderboard.push(entry);
  
  // Keep only top 100 entries
  leaderboard.sort((a, b) => a.time - b.time);
  if (leaderboard.length > 100) {
    leaderboard.length = 100;
  }

  res.json({ success: true, entry });
});

app.get('/api/leaderboard/:difficulty', (req, res) => {
  const { difficulty } = req.params;
  
  const filtered = leaderboard
    .filter(entry => entry.difficulty === difficulty)
    .sort((a, b) => a.time - b.time)
    .slice(0, 10); // Top 10 for each difficulty

  res.json({ leaderboard: filtered });
});

app.get('/api/leaderboard', (req, res) => {
  const byDifficulty = {};
  
  Object.keys(difficultyNames).forEach(key => {
    const diffName = difficultyNames[key];
    byDifficulty[diffName] = leaderboard
      .filter(entry => entry.difficulty === diffName)
      .sort((a, b) => a.time - b.time)
      .slice(0, 10);
  });

  res.json({ leaderboard: byDifficulty });
});

app.listen(PORT, () => {
  console.log(`Minesweeper server running on http://localhost:${PORT}`);
});
