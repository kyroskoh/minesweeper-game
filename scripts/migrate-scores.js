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

async function main() {
  console.log('\n🔄 Minesweeper Score Migration Tool\n');
  console.log('This tool helps fix scores that were incorrectly categorized due to bugs.');
  console.log('═'.repeat(70) + '\n');

  const dbPath = path.join(__dirname, '../leaderboard.db');
  
  try {
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(buffer);
    
    // Show main menu
    console.log('Select an operation:');
    console.log('  1) View all scores (grouped by type)');
    console.log('  2) Move scores from Regular to Daily');
    console.log('  3) Move scores from Daily to Regular');
    console.log('  4) Move specific score by ID');
    console.log('  5) Move scores by name and date');
    console.log('  6) Exit\n');
    
    const choice = await question('Enter your choice (1-6): ');
    
    switch (choice.trim()) {
      case '1':
        await viewScores(db);
        break;
      case '2':
        await migrateScores(db, 0, 1); // Regular to Daily
        break;
      case '3':
        await migrateScores(db, 1, 0); // Daily to Regular
        break;
      case '4':
        await migrateById(db);
        break;
      case '5':
        await migrateByNameAndDate(db);
        break;
      case '6':
        console.log('\n👋 Goodbye!\n');
        rl.close();
        return;
      default:
        console.log('\n❌ Invalid choice!\n');
        rl.close();
        return;
    }
    
    // Save database
    console.log('\n💾 Saving changes to database...');
    const data = db.export();
    const newBuffer = Buffer.from(data);
    fs.writeFileSync(dbPath, newBuffer);
    db.close();
    
    console.log('✅ Database saved successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

async function viewScores(db) {
  console.log('\n📊 Current Scores:\n');
  
  // Regular scores
  const regularStmt = db.prepare(
    'SELECT id, name, time, difficulty, date FROM leaderboard WHERE is_daily = 0 ORDER BY difficulty, time ASC'
  );
  
  console.log('🎮 REGULAR GAME SCORES:');
  console.log('─'.repeat(70));
  let hasRegular = false;
  
  while (regularStmt.step()) {
    hasRegular = true;
    const row = regularStmt.getAsObject();
    const date = new Date(row.date).toLocaleDateString();
    console.log(`  [ID:${row.id}] ${row.name} - ${formatTime(row.time)} (${row.difficulty}) - ${date}`);
  }
  regularStmt.free();
  
  if (!hasRegular) {
    console.log('  (No regular scores)\n');
  }
  
  console.log('');
  
  // Daily scores
  const dailyStmt = db.prepare(
    'SELECT id, name, time, difficulty, date FROM leaderboard WHERE is_daily = 1 ORDER BY difficulty, time ASC'
  );
  
  console.log('📅 DAILY PUZZLE SCORES:');
  console.log('─'.repeat(70));
  let hasDaily = false;
  
  while (dailyStmt.step()) {
    hasDaily = true;
    const row = dailyStmt.getAsObject();
    const date = new Date(row.date).toLocaleDateString();
    console.log(`  [ID:${row.id}] ${row.name} - ${formatTime(row.time)} (${row.difficulty}) - ${date}`);
  }
  dailyStmt.free();
  
  if (!hasDaily) {
    console.log('  (No daily scores)\n');
  }
}

async function migrateScores(db, fromType, toType) {
  const fromLabel = fromType === 0 ? 'Regular' : 'Daily';
  const toLabel = toType === 0 ? 'Regular' : 'Daily';
  
  console.log(`\n🔄 Migrating scores from ${fromLabel} to ${toLabel}\n`);
  
  // Get scores to migrate
  const stmt = db.prepare(
    'SELECT id, name, time, difficulty, date FROM leaderboard WHERE is_daily = ? ORDER BY date DESC'
  );
  stmt.bind([fromType]);
  
  const scores = [];
  while (stmt.step()) {
    scores.push(stmt.getAsObject());
  }
  stmt.free();
  
  if (scores.length === 0) {
    console.log(`No ${fromLabel} scores found.\n`);
    return;
  }
  
  console.log(`Found ${scores.length} ${fromLabel} score(s):\n`);
  scores.forEach((score, index) => {
    const date = new Date(score.date).toLocaleDateString();
    console.log(`  ${index + 1}) [ID:${score.id}] ${score.name} - ${formatTime(score.time)} (${score.difficulty}) - ${date}`);
  });
  
  console.log('\nOptions:');
  console.log('  - Enter score numbers to migrate (e.g., "1,3,5" or "1-5")');
  console.log('  - Enter "all" to migrate all scores');
  console.log('  - Enter "cancel" to go back\n');
  
  const input = await question('Enter your selection: ');
  
  if (input.trim().toLowerCase() === 'cancel') {
    console.log('Migration cancelled.');
    return;
  }
  
  let indicesToMigrate = [];
  
  if (input.trim().toLowerCase() === 'all') {
    indicesToMigrate = scores.map((_, i) => i);
  } else {
    // Parse selection
    const parts = input.split(',').map(s => s.trim());
    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(n => parseInt(n) - 1);
        for (let i = start; i <= end && i < scores.length; i++) {
          if (i >= 0) indicesToMigrate.push(i);
        }
      } else {
        const idx = parseInt(part) - 1;
        if (idx >= 0 && idx < scores.length) {
          indicesToMigrate.push(idx);
        }
      }
    }
  }
  
  if (indicesToMigrate.length === 0) {
    console.log('No valid scores selected.');
    return;
  }
  
  // Remove duplicates
  indicesToMigrate = [...new Set(indicesToMigrate)];
  
  console.log(`\n⚠️  About to migrate ${indicesToMigrate.length} score(s) from ${fromLabel} to ${toLabel}:`);
  indicesToMigrate.forEach(idx => {
    const score = scores[idx];
    const date = new Date(score.date).toLocaleDateString();
    console.log(`  • ${score.name} - ${formatTime(score.time)} (${score.difficulty}) - ${date}`);
  });
  
  const confirm = await question('\nProceed with migration? (yes/no): ');
  
  if (confirm.trim().toLowerCase() !== 'yes') {
    console.log('Migration cancelled.');
    return;
  }
  
  // Perform migration
  indicesToMigrate.forEach(idx => {
    const score = scores[idx];
    db.run('UPDATE leaderboard SET is_daily = ? WHERE id = ?', [toType, score.id]);
  });
  
  console.log(`\n✅ Successfully migrated ${indicesToMigrate.length} score(s)!`);
}

async function migrateById(db) {
  console.log('\n🔍 Migrate Score by ID\n');
  
  const id = await question('Enter score ID: ');
  const scoreId = parseInt(id);
  
  if (isNaN(scoreId)) {
    console.log('Invalid ID!');
    return;
  }
  
  const stmt = db.prepare('SELECT id, name, time, difficulty, date, is_daily FROM leaderboard WHERE id = ?');
  stmt.bind([scoreId]);
  
  if (!stmt.step()) {
    console.log(`Score with ID ${scoreId} not found.`);
    stmt.free();
    return;
  }
  
  const score = stmt.getAsObject();
  stmt.free();
  
  const date = new Date(score.date).toLocaleDateString();
  const currentType = score.is_daily === 1 ? 'Daily' : 'Regular';
  const newType = score.is_daily === 1 ? 'Regular' : 'Daily';
  
  console.log(`\nScore Details:`);
  console.log(`  Name: ${score.name}`);
  console.log(`  Time: ${formatTime(score.time)}`);
  console.log(`  Difficulty: ${score.difficulty}`);
  console.log(`  Date: ${date}`);
  console.log(`  Current Type: ${currentType}`);
  console.log(`  Will become: ${newType}\n`);
  
  const confirm = await question('Proceed with migration? (yes/no): ');
  
  if (confirm.trim().toLowerCase() !== 'yes') {
    console.log('Migration cancelled.');
    return;
  }
  
  const newIsDaily = score.is_daily === 1 ? 0 : 1;
  db.run('UPDATE leaderboard SET is_daily = ? WHERE id = ?', [newIsDaily, scoreId]);
  
  console.log(`\n✅ Score migrated from ${currentType} to ${newType}!`);
}

async function migrateByNameAndDate(db) {
  console.log('\n🔍 Migrate Scores by Name and Date\n');
  
  const name = await question('Enter player name (or partial name): ');
  const dateInput = await question('Enter date (YYYY-MM-DD) or leave empty for all dates: ');
  
  let query = 'SELECT id, name, time, difficulty, date, is_daily FROM leaderboard WHERE name LIKE ?';
  let params = [`%${name}%`];
  
  if (dateInput.trim()) {
    query += ' AND date LIKE ?';
    params.push(`${dateInput}%`);
  }
  
  query += ' ORDER BY date DESC';
  
  const stmt = db.prepare(query);
  stmt.bind(params);
  
  const scores = [];
  while (stmt.step()) {
    scores.push(stmt.getAsObject());
  }
  stmt.free();
  
  if (scores.length === 0) {
    console.log('No matching scores found.');
    return;
  }
  
  console.log(`\nFound ${scores.length} matching score(s):\n`);
  scores.forEach((score, index) => {
    const date = new Date(score.date).toLocaleDateString();
    const type = score.is_daily === 1 ? '📅 Daily' : '🎮 Regular';
    console.log(`  ${index + 1}) [ID:${score.id}] ${score.name} - ${formatTime(score.time)} (${score.difficulty}) - ${date} - ${type}`);
  });
  
  console.log('\nEnter score numbers to toggle their type (e.g., "1,3,5" or "all"):');
  const input = await question('Selection: ');
  
  if (input.trim().toLowerCase() === 'cancel') {
    console.log('Migration cancelled.');
    return;
  }
  
  let indicesToMigrate = [];
  
  if (input.trim().toLowerCase() === 'all') {
    indicesToMigrate = scores.map((_, i) => i);
  } else {
    const parts = input.split(',').map(s => s.trim());
    for (const part of parts) {
      const idx = parseInt(part) - 1;
      if (idx >= 0 && idx < scores.length) {
        indicesToMigrate.push(idx);
      }
    }
  }
  
  if (indicesToMigrate.length === 0) {
    console.log('No valid scores selected.');
    return;
  }
  
  console.log(`\n⚠️  About to toggle type for ${indicesToMigrate.length} score(s):`);
  indicesToMigrate.forEach(idx => {
    const score = scores[idx];
    const date = new Date(score.date).toLocaleDateString();
    const oldType = score.is_daily === 1 ? 'Daily' : 'Regular';
    const newType = score.is_daily === 1 ? 'Regular' : 'Daily';
    console.log(`  • ${score.name} - ${score.difficulty} - ${date}: ${oldType} → ${newType}`);
  });
  
  const confirm = await question('\nProceed? (yes/no): ');
  
  if (confirm.trim().toLowerCase() !== 'yes') {
    console.log('Migration cancelled.');
    return;
  }
  
  indicesToMigrate.forEach(idx => {
    const score = scores[idx];
    const newIsDaily = score.is_daily === 1 ? 0 : 1;
    db.run('UPDATE leaderboard SET is_daily = ? WHERE id = ?', [newIsDaily, score.id]);
  });
  
  console.log(`\n✅ Successfully toggled ${indicesToMigrate.length} score(s)!`);
}

main();

