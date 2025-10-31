require('dotenv').config();

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { Pool } = require('pg');

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'minesweeper',
  user: process.env.POSTGRES_USER || 'minesweeper_user',
  password: process.env.POSTGRES_PASSWORD,
  max: 10,
  connectionTimeoutMillis: 5000,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Paths
const dbPath = path.join(__dirname, '../leaderboard.db');
const historicalDbDir = path.join(__dirname, '../historical_daily');

async function testConnection() {
  console.log('🔌 Testing PostgreSQL connection...');
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connection successful');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    console.error('\nPlease check your .env file has correct PostgreSQL credentials:');
    console.error('  POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD');
    return false;
  }
}

async function createTables() {
  console.log('\n📋 Creating PostgreSQL tables...');
  const client = await pool.connect();
  
  try {
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
    console.log('  ✅ Created leaderboard table');
    
    // Create daily_leaderboard table
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
    console.log('  ✅ Created daily_leaderboard table');
    
    // Create indexes
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
    console.log('  ✅ Created indexes');
    
  } finally {
    client.release();
  }
}

async function migrateMainDatabase() {
  console.log('\n📦 Migrating main leaderboard database...');
  
  if (!fs.existsSync(dbPath)) {
    console.log('  ⚠️  No leaderboard.db found, skipping main database migration');
    return 0;
  }
  
  try {
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(buffer);
    
    // Get all records from SQLite
    const stmt = db.prepare('SELECT name, time, difficulty, date, is_daily, device_id FROM leaderboard ORDER BY id');
    const records = [];
    
    while (stmt.step()) {
      records.push(stmt.getAsObject());
    }
    stmt.free();
    db.close();
    
    console.log(`  📊 Found ${records.length} records in SQLite database`);
    
    if (records.length === 0) {
      console.log('  ✅ No records to migrate');
      return 0;
    }
    
    // Insert into PostgreSQL
    const client = await pool.connect();
    let migrated = 0;
    
    try {
      await client.query('BEGIN');
      
      for (const record of records) {
        try {
          await client.query(
            'INSERT INTO leaderboard (name, time, difficulty, date, is_daily, device_id) VALUES ($1, $2, $3, $4, $5, $6)',
            [
              record.name,
              record.time,
              record.difficulty,
              record.date,
              record.is_daily === 1,
              record.device_id || null
            ]
          );
          migrated++;
        } catch (err) {
          console.error(`  ⚠️  Error migrating record: ${err.message}`);
        }
      }
      
      await client.query('COMMIT');
      console.log(`  ✅ Successfully migrated ${migrated} records to PostgreSQL`);
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
    return migrated;
    
  } catch (error) {
    console.error('  ❌ Error migrating main database:', error.message);
    throw error;
  }
}

async function migrateHistoricalDatabases() {
  console.log('\n📅 Migrating historical daily databases...');
  
  if (!fs.existsSync(historicalDbDir)) {
    console.log('  ⚠️  No historical_daily directory found, skipping historical migration');
    return 0;
  }
  
  const files = fs.readdirSync(historicalDbDir)
    .filter(f => f.startsWith('historical_daily_leaderboard_') && f.endsWith('.db'));
  
  console.log(`  📊 Found ${files.length} historical database files`);
  
  if (files.length === 0) {
    console.log('  ✅ No historical databases to migrate');
    return 0;
  }
  
  let totalMigrated = 0;
  const SQL = await initSqlJs();
  
  for (const file of files) {
    const filePath = path.join(historicalDbDir, file);
    
    // Extract date from filename: historical_daily_leaderboard_YYYYMMDD.db
    const dateMatch = file.match(/historical_daily_leaderboard_(\d{8})\.db/);
    if (!dateMatch) {
      console.log(`  ⚠️  Skipping ${file} - invalid filename format`);
      continue;
    }
    
    const dateStr = dateMatch[1];
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const puzzleDate = `${year}-${month}-${day}`;
    
    try {
      const buffer = fs.readFileSync(filePath);
      const db = new SQL.Database(buffer);
      
      // Get all records from this historical database
      const stmt = db.prepare('SELECT name, time, difficulty, date, device_id FROM daily_leaderboard ORDER BY id');
      const records = [];
      
      while (stmt.step()) {
        records.push(stmt.getAsObject());
      }
      stmt.free();
      db.close();
      
      if (records.length === 0) {
        console.log(`  ℹ️  ${file}: 0 records`);
        continue;
      }
      
      // Insert into PostgreSQL
      const client = await pool.connect();
      let migrated = 0;
      
      try {
        await client.query('BEGIN');
        
        for (const record of records) {
          try {
            await client.query(
              'INSERT INTO daily_leaderboard (name, time, difficulty, date, device_id, puzzle_date) VALUES ($1, $2, $3, $4, $5, $6)',
              [
                record.name,
                record.time,
                record.difficulty,
                record.date,
                record.device_id || null,
                puzzleDate
              ]
            );
            migrated++;
          } catch (err) {
            console.error(`    ⚠️  Error migrating record from ${file}: ${err.message}`);
          }
        }
        
        await client.query('COMMIT');
        console.log(`  ✅ ${puzzleDate}: migrated ${migrated} records`);
        totalMigrated += migrated;
        
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ❌ Error processing ${file}:`, err.message);
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error(`  ❌ Error reading ${file}:`, error.message);
    }
  }
  
  console.log(`  ✅ Total historical records migrated: ${totalMigrated}`);
  return totalMigrated;
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  const client = await pool.connect();
  
  try {
    // Count records in leaderboard
    const leaderboardResult = await client.query('SELECT COUNT(*) FROM leaderboard');
    const leaderboardCount = parseInt(leaderboardResult.rows[0].count);
    console.log(`  📊 Leaderboard records: ${leaderboardCount}`);
    
    // Count records in daily_leaderboard
    const dailyResult = await client.query('SELECT COUNT(*) FROM daily_leaderboard');
    const dailyCount = parseInt(dailyResult.rows[0].count);
    console.log(`  📊 Daily leaderboard records: ${dailyCount}`);
    
    // Show sample records
    if (leaderboardCount > 0) {
      const sampleResult = await client.query('SELECT name, time, difficulty, date FROM leaderboard ORDER BY time ASC LIMIT 5');
      console.log('\n  📋 Sample records from leaderboard:');
      sampleResult.rows.forEach((row, idx) => {
        console.log(`    ${idx + 1}. ${row.name} - ${row.time}s (${row.difficulty}) - ${new Date(row.date).toLocaleDateString()}`);
      });
    }
    
    return { leaderboardCount, dailyCount };
    
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🚀 Minesweeper SQLite → PostgreSQL Migration Tool\n');
  console.log('================================================\n');
  
  try {
    // Test connection
    const connected = await testConnection();
    if (!connected) {
      process.exit(1);
    }
    
    // Create tables
    await createTables();
    
    // Migrate main database
    const mainMigrated = await migrateMainDatabase();
    
    // Migrate historical databases
    const historicalMigrated = await migrateHistoricalDatabases();
    
    // Verify migration
    const counts = await verifyMigration();
    
    // Summary
    console.log('\n================================================');
    console.log('✅ Migration Complete!\n');
    console.log(`📊 Summary:`);
    console.log(`   Main leaderboard: ${mainMigrated} records migrated`);
    console.log(`   Historical daily: ${historicalMigrated} records migrated`);
    console.log(`   Total in PostgreSQL: ${counts.leaderboardCount + counts.dailyCount} records`);
    console.log('\n💡 Next steps:');
    console.log('   1. Verify the data in PostgreSQL');
    console.log('   2. Start the server with: npm run start:postgres');
    console.log('   3. Test the application thoroughly');
    console.log('   4. Deploy to your HA servers\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
if (require.main === module) {
  main();
}

module.exports = { migrateMainDatabase, migrateHistoricalDatabases };

