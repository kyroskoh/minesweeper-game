#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Pro', 'Expert', 'Extreme'];

async function addScore() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('\n❌ Usage: node scripts/add-score.js <name> <time> <difficulty> [date] [--daily] [--device-id=<id>]');
    console.log('\nExamples:');
    console.log('  node scripts/add-score.js "John Doe" 45 Easy');
    console.log('  node scripts/add-score.js "Jane Smith" 120 Medium');
    console.log('  node scripts/add-score.js "Pro Player" 3:45 Hard "2025-10-15"');
    console.log('  node scripts/add-score.js "Speed Runner" 2:30 Expert "10/15/2025"');
    console.log('  node scripts/add-score.js "Daily Winner" 90 Pro --daily');
    console.log('  node scripts/add-score.js "Champion" 5:30 Extreme "2025-10-15" --daily');
    console.log('  node scripts/add-score.js "Alice" 60 Easy --device-id=device_1234567890_abc123');
    console.log('\nValid difficulties: Easy, Medium, Hard, Pro, Expert, Extreme');
    console.log('Time can be in seconds (e.g., 45) or mm:ss format (e.g., 3:45)');
    console.log('Date is optional (defaults to today). Formats: YYYY-MM-DD, MM/DD/YYYY, or any valid date string');
    console.log('Use --daily flag to mark this as a daily puzzle score');
    console.log('Use --device-id=<id> to specify a device ID (optional)');
    process.exit(1);
  }

  const name = args[0].trim();
  const timeInput = args[1].trim();
  const difficulty = args[2].trim();
  
  // Check for --daily flag in any position after difficulty
  const dailyFlagIndex = args.slice(3).findIndex(arg => arg === '--daily');
  const isDailyPuzzle = dailyFlagIndex !== -1;
  
  // Check for --device-id flag
  const deviceIdArg = args.slice(3).find(arg => arg.startsWith('--device-id='));
  const deviceId = deviceIdArg ? deviceIdArg.split('=')[1] : null;
  
  // Get date from args, excluding --daily and --device-id flags
  let dateInput = null;
  const remainingArgs = args.slice(3).filter(arg => arg !== '--daily' && !arg.startsWith('--device-id='));
  if (remainingArgs.length > 0) {
    dateInput = remainingArgs[0].trim();
  }

  // Validate name
  if (!name || name.length === 0) {
    console.error('❌ Error: Name cannot be empty');
    process.exit(1);
  }

  if (name.length > 20) {
    console.error('❌ Error: Name cannot be longer than 20 characters');
    process.exit(1);
  }

  // Validate difficulty
  if (!VALID_DIFFICULTIES.includes(difficulty)) {
    console.error(`❌ Error: Invalid difficulty "${difficulty}"`);
    console.log(`Valid difficulties: ${VALID_DIFFICULTIES.join(', ')}`);
    process.exit(1);
  }

  // Parse and validate time
  let timeInSeconds;
  
  // Check if time is in mm:ss or h:mm:ss format
  if (timeInput.includes(':')) {
    const parts = timeInput.split(':').map(p => parseInt(p, 10));
    
    if (parts.some(isNaN)) {
      console.error('❌ Error: Invalid time format. Use seconds (e.g., 45) or mm:ss (e.g., 3:45)');
      process.exit(1);
    }
    
    if (parts.length === 2) {
      // mm:ss format
      const [minutes, seconds] = parts;
      if (seconds >= 60) {
        console.error('❌ Error: Seconds must be less than 60 in mm:ss format');
        process.exit(1);
      }
      timeInSeconds = minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // h:mm:ss format
      const [hours, minutes, seconds] = parts;
      if (minutes >= 60 || seconds >= 60) {
        console.error('❌ Error: Minutes and seconds must be less than 60 in h:mm:ss format');
        process.exit(1);
      }
      timeInSeconds = hours * 3600 + minutes * 60 + seconds;
    } else {
      console.error('❌ Error: Invalid time format. Use seconds (e.g., 45) or mm:ss (e.g., 3:45)');
      process.exit(1);
    }
  } else {
    // Assume it's in seconds
    timeInSeconds = parseInt(timeInput, 10);
    
    if (isNaN(timeInSeconds)) {
      console.error('❌ Error: Time must be a number (in seconds)');
      process.exit(1);
    }
  }

  // Validate time is positive
  if (timeInSeconds <= 0) {
    console.error('❌ Error: Time must be greater than 0');
    process.exit(1);
  }

  // Parse and validate date
  let date;
  if (dateInput) {
    // Try to parse the provided date
    const parsedDate = new Date(dateInput);
    
    // Check if date is valid
    if (isNaN(parsedDate.getTime())) {
      console.error(`❌ Error: Invalid date "${dateInput}"`);
      console.log('Use formats like: 2025-10-20, 10/20/2025, or any valid date string');
      process.exit(1);
    }
    
    date = parsedDate.toISOString();
  } else {
    // Use today's date
    date = new Date().toISOString();
  }

  // Format time for display
  function formatTime(totalSeconds) {
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (days > 0) {
      return `${days}d:${String(hours).padStart(2, '0')}h:${String(minutes).padStart(2, '0')}m:${String(seconds).padStart(2, '0')}s`;
    } else if (hours > 0) {
      return `${String(hours).padStart(2, '0')}h:${String(minutes).padStart(2, '0')}m:${String(seconds).padStart(2, '0')}s`;
    } else if (minutes > 0) {
      return `${String(minutes).padStart(2, '0')}m:${String(seconds).padStart(2, '0')}s`;
    } else {
      return `${String(seconds).padStart(2, '0')}s`;
    }
  }
  
  function formatTimeWithTotal(totalSeconds) {
    const formatted = formatTime(totalSeconds);
    return `${formatted} (${totalSeconds}s)`;
  }

  console.log('\n📝 Adding score to leaderboard...');
  console.log(`   Name: ${name}`);
  console.log(`   Time: ${formatTimeWithTotal(timeInSeconds)}`);
  console.log(`   Difficulty: ${difficulty}`);
  console.log(`   Type: ${isDailyPuzzle ? '📅 Daily Puzzle' : '🎮 Regular Game'}`);
  console.log(`   Date: ${new Date(date).toLocaleDateString()}`);
  console.log(`   Device ID: ${deviceId || '(none - legacy score)'}`);


  // Helper function to get historical database path (same logic as backend)
  function getHistoricalDbPath(dateString) {
    const dateObj = new Date(dateString);
    
    // Convert to SGT (UTC+8)
    const utcTime = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
    const sgtDate = new Date(utcTime + (8 * 60 * 60000));
    
    const year = sgtDate.getUTCFullYear();
    const month = String(sgtDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(sgtDate.getUTCDate()).padStart(2, '0');
    
    const dateStr = `${year}${month}${day}`;
    const filename = `historical_daily_leaderboard_${dateStr}.db`;
    
    return path.join(__dirname, '../historical_daily', filename);
  }

  // Initialize database
  const dbPath = path.join(__dirname, '../leaderboard.db');
  
  try {
    const SQL = await initSqlJs();
    let buffer;
    
    try {
      buffer = fs.readFileSync(dbPath);
    } catch (error) {
      console.error('❌ Error: Database file not found. Please start the server at least once to create the database.');
      process.exit(1);
    }
    
    const db = new SQL.Database(buffer);
    
    // Insert the score with is_daily flag and device_id
    db.run(
      'INSERT INTO leaderboard (name, time, difficulty, date, is_daily, device_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, timeInSeconds, difficulty, date, isDailyPuzzle ? 1 : 0, deviceId]
    );
    
    // Save main database
    const data = db.export();
    const newBuffer = Buffer.from(data);
    fs.writeFileSync(dbPath, newBuffer);
    db.close();
    
    console.log('✅ Score added to main leaderboard!');
    
    // If this is a daily puzzle score, also save to historical database
    if (isDailyPuzzle) {
      try {
        const historicalDbPath = getHistoricalDbPath(date);
        const historicalDir = path.dirname(historicalDbPath);
        
        // Ensure historical directory exists
        if (!fs.existsSync(historicalDir)) {
          fs.mkdirSync(historicalDir, { recursive: true });
          console.log('📁 Created historical_daily directory');
        }
        
        // Load or create historical database
        let historicalBuffer;
        let isNewHistoricalDb = false;
        
        try {
          historicalBuffer = fs.readFileSync(historicalDbPath);
        } catch (error) {
          historicalBuffer = null;
          isNewHistoricalDb = true;
        }
        
        const historicalDb = new SQL.Database(historicalBuffer);
        
        // Create table if new database
        if (isNewHistoricalDb) {
          historicalDb.run(`
            CREATE TABLE IF NOT EXISTS daily_leaderboard (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              time INTEGER NOT NULL,
              difficulty TEXT NOT NULL,
              date TEXT NOT NULL,
              device_id TEXT
            )
          `);
          
          historicalDb.run(`
            CREATE INDEX IF NOT EXISTS idx_difficulty_time 
            ON daily_leaderboard(difficulty, time)
          `);
          
          console.log('📅 Created new historical database');
        }
        
        // Insert into historical database
        historicalDb.run(
          'INSERT INTO daily_leaderboard (name, time, difficulty, date, device_id) VALUES (?, ?, ?, ?, ?)',
          [name, timeInSeconds, difficulty, date, deviceId]
        );
        
        // Save historical database
        const historicalData = historicalDb.export();
        const historicalNewBuffer = Buffer.from(historicalData);
        fs.writeFileSync(historicalDbPath, historicalNewBuffer);
        
        const historicalFilename = path.basename(historicalDbPath);
        console.log(`✅ Score archived to historical database: ${historicalFilename}`);
        
        historicalDb.close();
      } catch (error) {
        console.error('⚠️  Warning: Could not save to historical database:', error.message);
        console.log('   Score was still saved to main leaderboard.');
      }
    }
    
    // Show current top 5 for this difficulty (filtered by daily/regular)
    const SQL2 = await initSqlJs();
    const db2 = new SQL.Database(fs.readFileSync(dbPath));
    const stmt = db2.prepare(
      'SELECT name, time, device_id FROM leaderboard WHERE difficulty = ? AND is_daily = ? ORDER BY time ASC LIMIT 5'
    );
    stmt.bind([difficulty, isDailyPuzzle ? 1 : 0]);
    
    const scoreType = isDailyPuzzle ? '📅 Daily Puzzle' : '🎮 Regular';
    console.log(`\n🏆 Top 5 - ${difficulty} (${scoreType}):`);
    
    // Track device counts for duplicate names
    const nameDeviceCounts = {};
    const scores = [];
    while (stmt.step()) {
      scores.push(stmt.getAsObject());
    }
    
    let rank = 1;
    scores.forEach(row => {
      const nameKey = row.name.toLowerCase();
      if (!nameDeviceCounts[nameKey]) {
        nameDeviceCounts[nameKey] = { devices: [], total: 0 };
      }
      
      const deviceId = row.device_id || `legacy_${Math.random()}`;
      const deviceIndex = nameDeviceCounts[nameKey].devices.indexOf(deviceId);
      
      if (deviceIndex === -1) {
        nameDeviceCounts[nameKey].devices.push(deviceId);
        nameDeviceCounts[nameKey].total++;
      }
      
      const deviceCount = nameDeviceCounts[nameKey].devices.indexOf(deviceId) + 1;
      const displayName = nameDeviceCounts[nameKey].total > 1 
        ? `${row.name} (${deviceCount})`
        : row.name;
      
      console.log(`   ${rank}. ${displayName} - ${formatTimeWithTotal(row.time)}`);
      rank++;
    });
    
    stmt.free();
    db2.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addScore();
