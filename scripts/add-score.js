#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert', 'Extreme'];

async function addScore() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.error('\n❌ Usage: node scripts/add-score.js <name> <time> <difficulty> [date]');
    console.log('\nExamples:');
    console.log('  node scripts/add-score.js "John Doe" 45 Easy');
    console.log('  node scripts/add-score.js "Jane Smith" 120 Medium');
    console.log('  node scripts/add-score.js "Pro Player" 3:45 Hard "2025-10-15"');
    console.log('  node scripts/add-score.js "Speed Runner" 2:30 Expert "10/15/2025"');
    console.log('\nValid difficulties: Easy, Medium, Hard, Expert, Extreme');
    console.log('Time can be in seconds (e.g., 45) or mm:ss format (e.g., 3:45)');
    console.log('Date is optional (defaults to today). Formats: YYYY-MM-DD, MM/DD/YYYY, or any valid date string');
    process.exit(1);
  }

  const name = args[0].trim();
  const timeInput = args[1].trim();
  const difficulty = args[2].trim();
  const dateInput = args[3] ? args[3].trim() : null;

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
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else if (minutes > 0) {
      return `${minutes}:${String(seconds).padStart(2, '0')}`;
    } else {
      return `${seconds}s`;
    }
  }

  console.log('\n📝 Adding score to leaderboard...');
  console.log(`   Name: ${name}`);
  console.log(`   Time: ${formatTime(timeInSeconds)} (${timeInSeconds} seconds)`);
  console.log(`   Difficulty: ${difficulty}`);
  console.log(`   Date: ${new Date(date).toLocaleDateString()}`);

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
    
    // Insert the score
    db.run(
      'INSERT INTO leaderboard (name, time, difficulty, date) VALUES (?, ?, ?, ?)',
      [name, timeInSeconds, difficulty, date]
    );
    
    // Save database
    const data = db.export();
    const newBuffer = Buffer.from(data);
    fs.writeFileSync(dbPath, newBuffer);
    db.close();
    
    console.log('✅ Score added successfully!');
    
    // Show current top 5 for this difficulty
    const SQL2 = await initSqlJs();
    const db2 = new SQL.Database(fs.readFileSync(dbPath));
    const stmt = db2.prepare(
      'SELECT name, time FROM leaderboard WHERE difficulty = ? ORDER BY time ASC LIMIT 5'
    );
    stmt.bind([difficulty]);
    
    console.log(`\n🏆 Top 5 - ${difficulty}:`);
    let rank = 1;
    while (stmt.step()) {
      const row = stmt.getAsObject();
      console.log(`   ${rank}. ${row.name} - ${formatTime(row.time)}`);
      rank++;
    }
    stmt.free();
    db2.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addScore();
