const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const app = express();
const PORT = 3030;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Store games in memory (in production, use a database)
const games = new Map();

// Initialize SQLite database
const dbPath = path.join(__dirname, '../leaderboard.db');
let db;

initSqlJs().then(SQL => {
  let buffer;
  let isNewDatabase = false;
  
  try {
    buffer = fs.readFileSync(dbPath);
    console.log('Loading existing database from disk...');
  } catch (error) {
    // Database doesn't exist yet
    buffer = null;
    isNewDatabase = true;
    console.log('Creating new database...');
  }
  
  db = new SQL.Database(buffer);
  
  // Create leaderboard table if it doesn't exist (only runs for new DB)
  db.run(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      time INTEGER NOT NULL,
      difficulty TEXT NOT NULL,
      date TEXT NOT NULL,
      is_daily INTEGER DEFAULT 0
    )
  `);
  
  // Add is_daily column if it doesn't exist (for existing databases)
  try {
    db.run('ALTER TABLE leaderboard ADD COLUMN is_daily INTEGER DEFAULT 0');
    console.log('Added is_daily column to existing database');
  } catch (err) {
    // Column already exists, ignore
  }
  
  // Create index for faster queries (only runs for new DB)
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_difficulty_time 
    ON leaderboard(difficulty, time)
  `);
  
  // Only save to disk if it's a new database
  if (isNewDatabase) {
    saveDatabase();
    console.log('New database initialized and saved to disk');
  } else {
    console.log('Existing database loaded successfully');
  }
}).catch(err => {
  console.error('Failed to initialize database:', err);
});

// Function to save database to disk
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Function to reload database from disk
async function reloadDatabase() {
  try {
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(dbPath);
    if (db) {
      db.close();
    }
    db = new SQL.Database(buffer);
    return true;
  } catch (error) {
    console.error('Error reloading database:', error);
    return false;
  }
}

// Difficulty names
const difficultyNames = {
  '10-10-10': 'Easy',
  '15-15-25': 'Medium',
  '20-20-40': 'Hard',
  '30-30-50': 'Pro',
  '40-40-100': 'Expert',
  '50-50-150': 'Extreme'
};

// Game class
class MinesweeperGame {
  constructor(rows = 10, cols = 10, mines = 15, seed = null, isDailyPuzzle = false) {
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
    this.hitMineRow = null;
    this.hitMineCol = null;
    this.seed = seed;
    this.rng = null;
    this.isDailyPuzzle = isDailyPuzzle;
    this.initializeBoard(seed);
  }

  initializeBoard(seed = null) {
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

    // Use seed for deterministic placement if provided
    if (seed !== null) {
      this.seed = seed;
      this.rng = this.seededRandom(seed);
    }
    
    // All difficulties now use skill-based placement
    this.placeMinesSolvable();

    // Calculate numbers for non-mine cells
    for (let i = 0; i < this.rows; i++) {
      for (let j = 0; j < this.cols; j++) {
        if (this.board[i][j] !== -1) {
          this.board[i][j] = this.countAdjacentMines(i, j);
        }
      }
    }
  }

  seededRandom(seed) {
    // Simple seeded random number generator
    let state = seed;
    return function() {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  random() {
    return this.rng ? this.rng() : Math.random();
  }


  placeMinesSolvable() {
    // Place mines in clusters to create higher numbers (4, 5, 6) for logical solving
    let minesPlaced = 0;
    const clusterSize = 3; // Mines per cluster
    const numClusters = Math.ceil(this.minesCount / clusterSize);
    
    for (let cluster = 0; cluster < numClusters && minesPlaced < this.minesCount; cluster++) {
      // Pick a random center point for the cluster
      const centerRow = Math.floor(this.random() * this.rows);
      const centerCol = Math.floor(this.random() * this.cols);
      
      // Place mines in a cluster pattern around the center
      const offsets = [
        [0, 0], [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]
      ];
      
      // Shuffle offsets for variety
      for (let i = offsets.length - 1; i > 0; i--) {
        const j = Math.floor(this.random() * (i + 1));
        [offsets[i], offsets[j]] = [offsets[j], offsets[i]];
      }
      
      let clusterMinesPlaced = 0;
      for (const [dRow, dCol] of offsets) {
        if (minesPlaced >= this.minesCount || clusterMinesPlaced >= clusterSize) break;
        
        const row = centerRow + dRow;
        const col = centerCol + dCol;
        
        if (this.isValidCell(row, col) && this.board[row][col] !== -1) {
          this.board[row][col] = -1;
          minesPlaced++;
          clusterMinesPlaced++;
        }
      }
    }
    
    // Fill remaining mines with strategic placement
    let attempts = 0;
    const maxAttempts = this.rows * this.cols * 2;
    
    while (minesPlaced < this.minesCount && attempts < maxAttempts) {
      attempts++;
      const row = Math.floor(this.random() * this.rows);
      const col = Math.floor(this.random() * this.cols);
      
      if (this.board[row][col] !== -1) {
        // Check if placing here would create interesting numbers nearby
        const adjacentMines = this.countAdjacentMinesTemp(row, col);
        
        // Prefer positions that will create cells with 2-5 adjacent mines
        if (adjacentMines >= 1 && adjacentMines <= 4) {
          this.board[row][col] = -1;
          minesPlaced++;
        } else if (this.random() < 0.3) {
          // 30% chance to place anyway for variety
          this.board[row][col] = -1;
          minesPlaced++;
        }
      }
    }
    
    // If still not enough mines, place remaining randomly
    while (minesPlaced < this.minesCount) {
      const row = Math.floor(this.random() * this.rows);
      const col = Math.floor(this.random() * this.cols);
      
      if (this.board[row][col] !== -1) {
        this.board[row][col] = -1;
        minesPlaced++;
      }
    }
  }

  countAdjacentMinesTemp(row, col) {
    // Temporary count used during mine placement
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
      this.hitMineRow = row;
      this.hitMineCol = col;
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
      startTime: this.startTime,
      hitMineRow: this.hitMineRow,
      hitMineCol: this.hitMineCol
    };
  }

  getFinalTime() {
    if (this.startTime && this.endTime) {
      return Math.floor((this.endTime - this.startTime) / 1000);
    }
    return 0;
  }
}

// Get daily puzzle seed based on current date
function getDailySeed() {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  const day = today.getUTCDate();
  // Create a unique seed for today
  return year * 10000 + month * 100 + day;
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

app.post('/api/game/daily', (req, res) => {
  const { difficulty = 'medium' } = req.body;
  const seed = getDailySeed();
  
  // Daily puzzle configurations
  const dailyConfigs = {
    easy: { rows: 10, cols: 10, mines: 10 },
    medium: { rows: 15, cols: 15, mines: 25 },
    hard: { rows: 20, cols: 20, mines: 40 },
    pro: { rows: 30, cols: 30, mines: 50 },
    expert: { rows: 40, cols: 40, mines: 100 },
    extreme: { rows: 50, cols: 50, mines: 150 }
  };
  
  const config = dailyConfigs[difficulty] || dailyConfigs.medium;
  const gameId = `daily-${difficulty}-${seed}`;
  
  // Check if this daily puzzle already exists
  if (games.has(gameId)) {
    const game = games.get(gameId);
    return res.json({
      gameId,
      state: game.getGameState(),
      seed,
      isDailyPuzzle: true
    });
  }
  
  const game = new MinesweeperGame(config.rows, config.cols, config.mines, seed, true);
  games.set(gameId, game);
  
  res.json({
    gameId,
    state: game.getGameState(),
    seed,
    isDailyPuzzle: true
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

app.get('/api/game/:gameId/dev', (req, res) => {
  const { gameId } = req.params;
  const game = games.get(gameId);
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Return full board including mine positions (for developer mode)
  res.json({
    board: game.board,
    rows: game.rows,
    cols: game.cols
  });
});

app.post('/api/leaderboard', (req, res) => {
  const { name, time, difficulty, date, isDailyPuzzle = false } = req.body;
  
  if (!name || !time || !difficulty) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const entry = {
    name: name.substring(0, 20), // Limit name length
    time,
    difficulty,
    date: date || new Date().toISOString(), // Use provided date or current time
    isDailyPuzzle: isDailyPuzzle ? 1 : 0
  };

  try {
    db.run(
      'INSERT INTO leaderboard (name, time, difficulty, date, is_daily) VALUES (?, ?, ?, ?, ?)',
      [entry.name, entry.time, entry.difficulty, entry.date, entry.isDailyPuzzle]
    );
    saveDatabase();
    
    res.json({ success: true, entry });
  } catch (error) {
    console.error('Error saving to leaderboard:', error);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

app.get('/api/leaderboard/:difficulty', async (req, res) => {
  const { difficulty } = req.params;
  
  try {
    // Reload database from disk to get latest data
    await reloadDatabase();
    
    const stmt = db.prepare(
      'SELECT name, time, difficulty, date FROM leaderboard WHERE difficulty = ? ORDER BY time ASC LIMIT 10'
    );
    stmt.bind([difficulty]);
    
    const scores = [];
    while (stmt.step()) {
      scores.push(stmt.getAsObject());
    }
    stmt.free();
    
    res.json({ leaderboard: scores });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  const byDifficulty = {};
  
  try {
    // Reload database from disk to get latest data
    await reloadDatabase();
    
    Object.keys(difficultyNames).forEach(key => {
      const diffName = difficultyNames[key];
      const stmt = db.prepare(
        'SELECT name, time, difficulty, date FROM leaderboard WHERE difficulty = ? ORDER BY time ASC LIMIT 10'
      );
      stmt.bind([diffName]);
      
      const scores = [];
      while (stmt.step()) {
        scores.push(stmt.getAsObject());
      }
      stmt.free();
      
      byDifficulty[diffName] = scores;
    });

    res.json({ leaderboard: byDifficulty });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

//app.listen(PORT, () => {
//  console.log(`Minesweeper server running on http://localhost:${PORT}`);
//});

// Bind only to loopback (safer)
app.listen(PORT, '127.0.0.1', () => console.log(`API on 127.0.0.1:${PORT}`));

// If you use secure cookies/sessions behind Nginx:
app.set('trust proxy', 1); // so req.secure / X-Forwarded-* work

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  saveDatabase();
  if (db) db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  saveDatabase();
  if (db) db.close();
  process.exit(0);
});

