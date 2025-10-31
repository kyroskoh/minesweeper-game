require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3030;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Store games in memory (in production, use a database)
const games = new Map();

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'minesweeper',
  user: process.env.POSTGRES_USER || 'minesweeper_user',
  password: process.env.POSTGRES_PASSWORD,
  max: parseInt(process.env.POSTGRES_MAX_CONNECTIONS) || 20,
  idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Test database connection and initialize tables
async function initializeDatabase() {
  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    
    // Create leaderboard table
    await client.query(`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        time INTEGER NOT NULL,
        difficulty VARCHAR(50) NOT NULL,
        date TIMESTAMP NOT NULL,
        is_daily BOOLEAN DEFAULT FALSE,
        device_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create daily_leaderboard table for historical daily puzzles
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_leaderboard (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        time INTEGER NOT NULL,
        difficulty VARCHAR(50) NOT NULL,
        date TIMESTAMP NOT NULL,
        device_id VARCHAR(255),
        puzzle_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leaderboard_difficulty_time 
      ON leaderboard(difficulty, time)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_leaderboard_is_daily 
      ON leaderboard(is_daily)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_daily_leaderboard_puzzle_date 
      ON daily_leaderboard(puzzle_date, difficulty, time)
    `);
    
    client.release();
    console.log('✅ Database tables initialized');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    console.error('Make sure PostgreSQL is running and credentials are correct in .env');
    process.exit(1);
  }
}

// Initialize database on startup
initializeDatabase();

// Difficulty names
const difficultyNames = {
  '10-10-10': 'Easy',
  '15-15-25': 'Medium',
  '20-20-40': 'Hard',
  '30-30-50': 'Pro',
  '40-40-100': 'Expert',
  '50-50-150': 'Extreme'
};

// Game class (same as SQLite version)
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

// Secret salt for seed generation (keep this secret in production!)
const SEED_SALT = process.env.DAILY_SEED_SALT || 'minesweeper-daily-puzzle-salt-2025';

// Get daily puzzle seed based on current date and difficulty using cryptographic hashing
// Uses Singapore Time (SGT/UTC+8) for consistent daily reset
function getDailySeed(difficulty = 'medium') {
  const now = new Date();
  
  // Convert to Singapore Time (UTC+8)
  const sgtOffset = 8 * 60; // 8 hours in minutes
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000); // Get UTC time
  const sgtTime = new Date(utcTime + (sgtOffset * 60000)); // Add SGT offset
  
  const year = sgtTime.getFullYear();
  const month = String(sgtTime.getMonth() + 1).padStart(2, '0');
  const day = String(sgtTime.getDate()).padStart(2, '0');
  
  // Create a string combining date, difficulty, and secret salt
  const seedString = `${year}-${month}-${day}|${difficulty}|${SEED_SALT}`;
  
  // Generate SHA-256 hash
  const hash = crypto.createHash('sha256').update(seedString).digest('hex');
  
  // Convert first 8 characters of hash to integer
  const seed = parseInt(hash.substring(0, 8), 16);
  
  return seed;
}

// Helper function to get SGT date string for puzzle_date
function getSGTDateString() {
  const now = new Date();
  const sgtOffset = 8 * 60;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const sgtTime = new Date(utcTime + (sgtOffset * 60000));
  
  const year = sgtTime.getFullYear();
  const month = String(sgtTime.getMonth() + 1).padStart(2, '0');
  const day = String(sgtTime.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
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
  const seed = getDailySeed(difficulty);
  
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

app.post('/api/leaderboard', async (req, res) => {
  const { name, time, difficulty, date, isDailyPuzzle = false, deviceId } = req.body;
  
  if (!name || !time || !difficulty) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const entry = {
    name: name.substring(0, 20), // Limit name length
    time,
    difficulty,
    date: date || new Date().toISOString(),
    isDailyPuzzle: isDailyPuzzle,
    deviceId: deviceId || null
  };

  try {
    // Save to main leaderboard
    const result = await pool.query(
      'INSERT INTO leaderboard (name, time, difficulty, date, is_daily, device_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [entry.name, entry.time, entry.difficulty, entry.date, entry.isDailyPuzzle, entry.deviceId]
    );
    
    // If this is a daily puzzle score, also save to historical database
    if (entry.isDailyPuzzle) {
      try {
        const puzzleDate = getSGTDateString();
        await pool.query(
          'INSERT INTO daily_leaderboard (name, time, difficulty, date, device_id, puzzle_date) VALUES ($1, $2, $3, $4, $5, $6)',
          [entry.name, entry.time, entry.difficulty, entry.date, entry.deviceId, puzzleDate]
        );
        console.log(`✅ Daily score archived to historical database for ${puzzleDate}`);
      } catch (error) {
        console.error('Error saving to historical database:', error);
        // Don't fail the request if historical save fails
      }
    }
    
    res.json({ success: true, entry: { ...entry, id: result.rows[0].id } });
  } catch (error) {
    console.error('Error saving to leaderboard:', error);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

// API endpoint to list available historical dates
app.get('/api/leaderboard/daily-dates', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT puzzle_date 
      FROM daily_leaderboard 
      ORDER BY puzzle_date DESC
    `);
    
    const dates = result.rows.map(row => {
      const dateObj = new Date(row.puzzle_date);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const dateStr = `${year}${month}${day}`;
      
      return {
        dateKey: dateStr,
        displayDate: `${year}-${month}-${day}`
      };
    });
    
    res.json({ dates });
  } catch (error) {
    console.error('Error listing historical dates:', error);
    res.json({ dates: [] });
  }
});

// API endpoint to get historical daily scores for a specific date
app.get('/api/leaderboard/daily-history/:date', async (req, res) => {
  const { date } = req.params; // Format: YYYYMMDD
  
  try {
    // Parse date
    const year = date.substring(0, 4);
    const month = date.substring(4, 6);
    const day = date.substring(6, 8);
    const dateStr = `${year}-${month}-${day}`;
    
    const byDifficulty = {};
    
    for (const [key, diffName] of Object.entries(difficultyNames)) {
      const result = await pool.query(
        `SELECT name, time, difficulty, date, device_id 
         FROM daily_leaderboard 
         WHERE difficulty = $1 AND puzzle_date = $2 
         ORDER BY time ASC 
         LIMIT 10`,
        [diffName, dateStr]
      );
      
      byDifficulty[diffName] = result.rows;
    }
    
    res.json({ 
      date: dateStr,
      leaderboard: byDifficulty 
    });
  } catch (error) {
    console.error('Error fetching historical leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch historical leaderboard' });
  }
});

// Get all leaderboards grouped by difficulty
app.get('/api/leaderboard', async (req, res) => {
  const byDifficulty = {};
  
  try {
    for (const [key, diffName] of Object.entries(difficultyNames)) {
      const result = await pool.query(
        `SELECT name, time, difficulty, date, is_daily, device_id 
         FROM leaderboard 
         WHERE difficulty = $1 
         ORDER BY time ASC 
         LIMIT 10`,
        [diffName]
      );
      
      byDifficulty[diffName] = result.rows;
    }

    res.json({ leaderboard: byDifficulty });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get leaderboard for a specific difficulty
app.get('/api/leaderboard/:difficulty', async (req, res) => {
  const { difficulty } = req.params;
  
  try {
    const result = await pool.query(
      `SELECT name, time, difficulty, date, is_daily, device_id 
       FROM leaderboard 
       WHERE difficulty = $1 
       ORDER BY time ASC 
       LIMIT 10`,
      [difficulty]
    );
    
    res.json({ leaderboard: result.rows });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Bind only to loopback (safer)
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 Minesweeper server running on http://127.0.0.1:${PORT}`);
  console.log(`🐘 Using PostgreSQL database`);
  console.log(`   Host: ${process.env.POSTGRES_HOST || 'localhost'}`);
  console.log(`   Database: ${process.env.POSTGRES_DB || 'minesweeper'}`);
});

// If you use secure cookies/sessions behind Nginx:
app.set('trust proxy', 1);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await pool.end();
  process.exit(0);
});

