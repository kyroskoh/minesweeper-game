#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}h:${String(minutes).padStart(2, '0')}m:${String(seconds).padStart(2, '0')}s`;
  } else if (minutes > 0) {
    return `${String(minutes).padStart(2, '0')}m:${String(seconds).padStart(2, '0')}s`;
  } else {
    return `${String(seconds).padStart(2, '0')}s`;
  }
}

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
  
  return {
    path: path.join(__dirname, '../historical_daily', filename),
    dateKey: dateStr,
    displayDate: `${year}-${month}-${day}`
  };
}

async function main() {
  console.log('\n📅 Historical Daily Leaderboard Sync Tool\n');
  console.log('This tool syncs existing daily puzzle scores from the main leaderboard');
  console.log('into their respective historical daily databases.\n');
  console.log('═'.repeat(70) + '\n');

  const dbPath = path.join(__dirname, '../leaderboard.db');
  
  try {
    // Check if main database exists
    if (!fs.existsSync(dbPath)) {
      console.error('❌ Error: leaderboard.db not found!');
      console.log('Please start the server at least once to create the database.\n');
      process.exit(1);
    }

    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(buffer);
    
    // Query all daily puzzle scores
    console.log('🔍 Scanning main leaderboard for daily puzzle scores...\n');
    
    const stmt = db.prepare(
      'SELECT id, name, time, difficulty, date, device_id FROM leaderboard WHERE is_daily = 1 ORDER BY date ASC'
    );
    
    const dailyScores = [];
    while (stmt.step()) {
      dailyScores.push(stmt.getAsObject());
    }
    stmt.free();
    
    if (dailyScores.length === 0) {
      console.log('ℹ️  No daily puzzle scores found in the main leaderboard.');
      console.log('Nothing to sync!\n');
      db.close();
      rl.close();
      return;
    }
    
    // Group scores by date
    const scoresByDate = {};
    dailyScores.forEach(score => {
      const histInfo = getHistoricalDbPath(score.date);
      if (!scoresByDate[histInfo.dateKey]) {
        scoresByDate[histInfo.dateKey] = {
          dateKey: histInfo.dateKey,
          displayDate: histInfo.displayDate,
          dbPath: histInfo.path,
          scores: []
        };
      }
      scoresByDate[histInfo.dateKey].scores.push(score);
    });
    
    const dates = Object.keys(scoresByDate).sort();
    const totalDates = dates.length;
    const totalScores = dailyScores.length;
    
    console.log(`✅ Found ${totalScores} daily puzzle score(s) across ${totalDates} date(s)\n`);
    
    // Show summary by date
    console.log('📊 Summary by Date:\n');
    dates.forEach(dateKey => {
      const dateInfo = scoresByDate[dateKey];
      const exists = fs.existsSync(dateInfo.dbPath);
      const status = exists ? '✓ DB exists' : '○ DB will be created';
      console.log(`   ${dateInfo.displayDate} (${dateKey}): ${dateInfo.scores.length} score(s) - ${status}`);
    });
    
    console.log('\n' + '─'.repeat(70) + '\n');
    console.log('Options:');
    console.log('  1) Preview what will be synced (dry run)');
    console.log('  2) Sync all scores to historical databases');
    console.log('  3) Sync specific date(s) only');
    console.log('  4) Exit\n');
    
    const choice = await question('Select an option (1-4): ');
    
    switch(choice.trim()) {
      case '1':
        await previewSync(scoresByDate, dates, SQL);
        break;
      case '2':
        await syncAll(scoresByDate, dates, SQL);
        break;
      case '3':
        await syncSpecificDates(scoresByDate, dates, SQL);
        break;
      case '4':
      default:
        console.log('\nExiting...\n');
        break;
    }
    
    db.close();
    rl.close();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    rl.close();
    process.exit(1);
  }
}

async function previewSync(scoresByDate, dates, SQL) {
  console.log('\n📋 DRY RUN - Preview Mode\n');
  console.log('This shows what WOULD be synced (no changes will be made)\n');
  console.log('═'.repeat(70) + '\n');
  
  for (const dateKey of dates) {
    const dateInfo = scoresByDate[dateKey];
    const exists = fs.existsSync(dateInfo.dbPath);
    
    console.log(`📅 ${dateInfo.displayDate} (${dateKey})`);
    console.log(`   Historical DB: ${exists ? 'EXISTS' : 'WILL BE CREATED'}`);
    console.log(`   Scores to sync: ${dateInfo.scores.length}\n`);
    
    // If DB exists, check for duplicates
    if (exists) {
      try {
        const histBuffer = fs.readFileSync(dateInfo.dbPath);
        const histDb = new SQL.Database(histBuffer);
        
        const existingIds = new Set();
        const checkStmt = histDb.prepare('SELECT name, time, difficulty FROM daily_leaderboard');
        
        while (checkStmt.step()) {
          const row = checkStmt.getAsObject();
          existingIds.add(`${row.name}_${row.time}_${row.difficulty}`);
        }
        checkStmt.free();
        histDb.close();
        
        let newCount = 0;
        let duplicateCount = 0;
        
        dateInfo.scores.forEach(score => {
          const key = `${score.name}_${score.time}_${score.difficulty}`;
          if (existingIds.has(key)) {
            duplicateCount++;
          } else {
            newCount++;
          }
        });
        
        console.log(`   ✓ ${newCount} new score(s) will be added`);
        if (duplicateCount > 0) {
          console.log(`   ⊘ ${duplicateCount} duplicate(s) will be skipped`);
        }
      } catch (error) {
        console.log(`   ⚠️  Could not read existing database: ${error.message}`);
      }
    } else {
      console.log(`   ✓ All ${dateInfo.scores.length} score(s) will be added (new DB)`);
    }
    
    console.log();
  }
  
  console.log('─'.repeat(70));
  console.log('\nℹ️  This was a preview. No changes were made.\n');
}

async function syncAll(scoresByDate, dates, SQL) {
  console.log('\n⚠️  About to sync ALL daily scores to historical databases\n');
  
  const totalScores = dates.reduce((sum, dateKey) => sum + scoresByDate[dateKey].scores.length, 0);
  console.log(`This will process ${totalScores} score(s) across ${dates.length} date(s)\n`);
  
  const confirm = await question('Proceed with sync? (yes/no): ');
  
  if (confirm.trim().toLowerCase() !== 'yes') {
    console.log('\nSync cancelled.\n');
    return;
  }
  
  await performSync(scoresByDate, dates, SQL);
}

async function syncSpecificDates(scoresByDate, dates, SQL) {
  console.log('\n📅 Select Date(s) to Sync\n');
  
  dates.forEach((dateKey, index) => {
    const dateInfo = scoresByDate[dateKey];
    console.log(`  ${index + 1}) ${dateInfo.displayDate} - ${dateInfo.scores.length} score(s)`);
  });
  
  console.log('\nEnter date numbers to sync (e.g., "1,3,5" or "1-3")');
  console.log('Or enter "all" to sync all dates\n');
  
  const input = await question('Your selection: ');
  
  if (input.trim().toLowerCase() === 'all') {
    await performSync(scoresByDate, dates, SQL);
    return;
  }
  
  // Parse selection
  let indicesToSync = [];
  const parts = input.split(',').map(s => s.trim());
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n) - 1);
      for (let i = start; i <= end && i < dates.length; i++) {
        if (i >= 0) indicesToSync.push(i);
      }
    } else {
      const idx = parseInt(part) - 1;
      if (idx >= 0 && idx < dates.length) {
        indicesToSync.push(idx);
      }
    }
  }
  
  if (indicesToSync.length === 0) {
    console.log('\nNo valid dates selected.\n');
    return;
  }
  
  // Remove duplicates
  indicesToSync = [...new Set(indicesToSync)];
  
  const selectedDates = indicesToSync.map(i => dates[i]);
  const selectedScoreCount = selectedDates.reduce((sum, dateKey) => sum + scoresByDate[dateKey].scores.length, 0);
  
  console.log(`\n⚠️  About to sync ${selectedScoreCount} score(s) from ${selectedDates.length} date(s)\n`);
  
  const confirm = await question('Proceed with sync? (yes/no): ');
  
  if (confirm.trim().toLowerCase() !== 'yes') {
    console.log('\nSync cancelled.\n');
    return;
  }
  
  await performSync(scoresByDate, selectedDates, SQL);
}

async function performSync(scoresByDate, datesToSync, SQL) {
  console.log('\n🚀 Starting sync...\n');
  
  const historicalDir = path.join(__dirname, '../historical_daily');
  
  // Ensure historical directory exists
  if (!fs.existsSync(historicalDir)) {
    fs.mkdirSync(historicalDir, { recursive: true });
    console.log('📁 Created historical_daily directory\n');
  }
  
  let totalProcessed = 0;
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let dbsCreated = 0;
  
  for (const dateKey of datesToSync) {
    const dateInfo = scoresByDate[dateKey];
    const dbExists = fs.existsSync(dateInfo.dbPath);
    
    console.log(`📅 Processing ${dateInfo.displayDate}...`);
    
    try {
      // Load or create historical database
      let historicalBuffer;
      let isNewDb = false;
      
      if (dbExists) {
        historicalBuffer = fs.readFileSync(dateInfo.dbPath);
      } else {
        historicalBuffer = null;
        isNewDb = true;
      }
      
      const historicalDb = new SQL.Database(historicalBuffer);
      
      // Create table if new database
      if (isNewDb) {
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
        
        console.log(`   ✓ Created new historical database`);
        dbsCreated++;
      }
      
      // Get existing scores to avoid duplicates
      const existingScores = new Set();
      const existingStmt = historicalDb.prepare('SELECT name, time, difficulty FROM daily_leaderboard');
      
      while (existingStmt.step()) {
        const row = existingStmt.getAsObject();
        existingScores.add(`${row.name}_${row.time}_${row.difficulty}`);
      }
      existingStmt.free();
      
      // Insert scores
      let added = 0;
      let skipped = 0;
      
      const insertStmt = historicalDb.prepare(
        'INSERT INTO daily_leaderboard (name, time, difficulty, date, device_id) VALUES (?, ?, ?, ?, ?)'
      );
      
      dateInfo.scores.forEach(score => {
        const key = `${score.name}_${score.time}_${score.difficulty}`;
        
        if (existingScores.has(key)) {
          skipped++;
        } else {
          try {
            insertStmt.run([
              score.name,
              score.time,
              score.difficulty,
              score.date,
              score.device_id
            ]);
            added++;
          } catch (error) {
            console.log(`   ⚠️  Failed to insert score: ${score.name} - ${error.message}`);
            totalErrors++;
          }
        }
      });
      
      insertStmt.free();
      
      // Save historical database
      const historicalData = historicalDb.export();
      const historicalBuffer2 = Buffer.from(historicalData);
      fs.writeFileSync(dateInfo.dbPath, historicalBuffer2);
      historicalDb.close();
      
      console.log(`   ✓ Added ${added} score(s)`);
      if (skipped > 0) {
        console.log(`   ⊘ Skipped ${skipped} duplicate(s)`);
      }
      
      totalProcessed += dateInfo.scores.length;
      totalAdded += added;
      totalSkipped += skipped;
      
    } catch (error) {
      console.log(`   ❌ Error processing ${dateInfo.displayDate}: ${error.message}`);
      totalErrors++;
    }
    
    console.log();
  }
  
  // Summary
  console.log('═'.repeat(70));
  console.log('\n✅ Sync Complete!\n');
  console.log(`📊 Summary:`);
  console.log(`   Total scores processed: ${totalProcessed}`);
  console.log(`   Successfully added: ${totalAdded}`);
  console.log(`   Skipped (duplicates): ${totalSkipped}`);
  if (totalErrors > 0) {
    console.log(`   Errors: ${totalErrors}`);
  }
  if (dbsCreated > 0) {
    console.log(`   New databases created: ${dbsCreated}`);
  }
  console.log();
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

