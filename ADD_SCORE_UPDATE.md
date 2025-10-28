# Add-Score Script Update Summary

## Overview
The `add-score.js` script has been updated to support the new **Pro difficulty** and **Daily Puzzle** scoring system.

## What's New

### ✨ New Features

#### 1. Pro Difficulty Support
Added **Pro** to the list of valid difficulties:
- Easy (10×10, 10 mines)
- Medium (15×15, 25 mines)
- Hard (20×20, 40 mines)
- **Pro (30×30, 50 mines)** ← NEW!
- Expert (40×40, 100 mines)
- Extreme (50×50, 150 mines)

#### 2. Daily Puzzle Flag
New `--daily` flag to mark scores as daily puzzle completions:

```bash
# Regular game
node scripts/add-score.js "Player" 90 Pro

# Daily puzzle
node scripts/add-score.js "Player" 90 Pro --daily
```

#### 3. Separate Leaderboards
Regular games and daily puzzles now have separate top 5 lists:

**Regular Game:**
```
🏆 Top 5 - Pro (🎮 Regular):
   1. Speed Runner - 01m15s (75s)
   2. Pro Player - 01m30s (90s)
```

**Daily Puzzle:**
```
🏆 Top 5 - Pro (📅 Daily Puzzle):
   1. Daily Champion - 01m20s (80s)
   2. Daily Winner - 01m35s (95s)
```

## Changes Made

### Code Updates

#### 1. Valid Difficulties Array
```javascript
// Before
const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Expert', 'Extreme'];

// After
const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Pro', 'Expert', 'Extreme'];
```

#### 2. Argument Parsing
Added smart parsing for the `--daily` flag:
```javascript
// Check for --daily flag in any position after difficulty
const dailyFlagIndex = args.slice(3).findIndex(arg => arg === '--daily');
const isDailyPuzzle = dailyFlagIndex !== -1;

// Get date from args, excluding --daily flag
const remainingArgs = args.slice(3).filter(arg => arg !== '--daily');
```

#### 3. Database Insert
Updated to include `is_daily` column:
```javascript
// Before
db.run(
  'INSERT INTO leaderboard (name, time, difficulty, date) VALUES (?, ?, ?, ?)',
  [name, timeInSeconds, difficulty, date]
);

// After
db.run(
  'INSERT INTO leaderboard (name, time, difficulty, date, is_daily) VALUES (?, ?, ?, ?, ?)',
  [name, timeInSeconds, difficulty, date, isDailyPuzzle ? 1 : 0]
);
```

#### 4. Leaderboard Query
Updated to filter by puzzle type:
```javascript
// Before
SELECT name, time FROM leaderboard 
WHERE difficulty = ? 
ORDER BY time ASC LIMIT 5

// After
SELECT name, time FROM leaderboard 
WHERE difficulty = ? AND is_daily = ? 
ORDER BY time ASC LIMIT 5
```

#### 5. Display Output
Enhanced output with type indicator:
```javascript
console.log(`   Type: ${isDailyPuzzle ? '📅 Daily Puzzle' : '🎮 Regular Game'}`);
```

## Usage Examples

### All New Use Cases

#### Add Pro Difficulty Score
```bash
node scripts/add-score.js "Speed Runner" 75 Pro
```

Output:
```
📝 Adding score to leaderboard...
   Name: Speed Runner
   Time: 01m15s (75s)
   Difficulty: Pro
   Type: 🎮 Regular Game
   Date: 10/28/2025
✅ Score added successfully!
```

#### Add Daily Puzzle Score (Pro)
```bash
node scripts/add-score.js "Daily Winner" 90 Pro --daily
```

Output:
```
📝 Adding score to leaderboard...
   Name: Daily Winner
   Time: 01m30s (90s)
   Difficulty: Pro
   Type: 📅 Daily Puzzle
   Date: 10/28/2025
✅ Score added successfully!
```

#### Add Historical Daily Puzzle
```bash
node scripts/add-score.js "Past Champion" 5:30 Expert "2025-10-15" --daily
```

#### Daily Flag Position Flexible
```bash
# Both work the same
node scripts/add-score.js "Player" 120 Medium --daily "2025-10-15"
node scripts/add-score.js "Player" 120 Medium "2025-10-15" --daily
```

## Testing Completed

### Test 1: Help Output ✅
```bash
node scripts/add-score.js
```
Result: Shows updated help with Pro and --daily flag

### Test 2: Pro Difficulty Recognition ✅
```bash
node scripts/add-score.js "Test" 90 Pro --daily
```
Result: Accepts Pro as valid difficulty

### Test 3: Daily Flag Parsing ✅
Confirmed flag is properly detected and processed

### Test 4: Output Formatting ✅
Displays 📅 for daily puzzles, 🎮 for regular games

## Backward Compatibility

### ✅ Fully Compatible
All existing functionality remains unchanged:
- Regular game scores still work
- All old difficulties (Easy, Medium, Hard, Expert, Extreme) work
- Time formats unchanged
- Date formats unchanged
- Existing database scores remain intact

### Migration
No migration needed - the `is_daily` column:
- Defaults to 0 for existing records
- Is added automatically by server on first run
- Script handles missing column gracefully

## Database Schema

### Updated Schema
```sql
CREATE TABLE leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  time INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  date TEXT NOT NULL,
  is_daily INTEGER DEFAULT 0  -- NEW COLUMN
);
```

### Column Details
- `is_daily = 0`: Regular game score (default)
- `is_daily = 1`: Daily puzzle score

## Quick Reference

### Command Format
```
node scripts/add-score.js <name> <time> <difficulty> [date] [--daily]
```

### All Valid Difficulties
```
Easy, Medium, Hard, Pro, Expert, Extreme
```

### Time Formats
```
45          # Seconds
3:45        # Minutes:Seconds
1:30:45     # Hours:Minutes:Seconds
```

### Date Formats
```
2025-10-15              # ISO
10/15/2025              # US
October 15, 2025        # Natural
```

### Flags
```
--daily     # Mark as daily puzzle score
```

## Common Workflows

### Add Today's Daily Puzzle Scores (All Difficulties)
```bash
node scripts/add-score.js "Champion" 40 Easy --daily
node scripts/add-score.js "Champion" 70 Medium --daily
node scripts/add-score.js "Champion" 140 Hard --daily
node scripts/add-score.js "Champion" 200 Pro --daily
node scripts/add-score.js "Champion" 350 Expert --daily
node scripts/add-score.js "Champion" 700 Extreme --daily
```

### Import Competition Results
```bash
# Competition on 2025-10-20
node scripts/add-score.js "Winner" 85 Pro "2025-10-20"
node scripts/add-score.js "Second" 95 Pro "2025-10-20"
node scripts/add-score.js "Third" 110 Pro "2025-10-20"
```

### Test All Features
```bash
# Regular games for each difficulty
node scripts/add-score.js "Tester" 30 Easy
node scripts/add-score.js "Tester" 60 Medium
node scripts/add-score.js "Tester" 120 Hard
node scripts/add-score.js "Tester" 180 Pro
node scripts/add-score.js "Tester" 300 Expert
node scripts/add-score.js "Tester" 600 Extreme

# Daily puzzles for each difficulty
node scripts/add-score.js "Daily" 35 Easy --daily
node scripts/add-score.js "Daily" 65 Medium --daily
node scripts/add-score.js "Daily" 130 Hard --daily
node scripts/add-score.js "Daily" 190 Pro --daily
node scripts/add-score.js "Daily" 320 Expert --daily
node scripts/add-score.js "Daily" 650 Extreme --daily
```

## Files Modified

1. **scripts/add-score.js**
   - Updated VALID_DIFFICULTIES array
   - Added --daily flag parsing
   - Updated help text
   - Modified database insert query
   - Enhanced output display
   - Updated leaderboard query

2. **scripts/README.md** (NEW)
   - Complete documentation
   - Usage examples
   - Testing scenarios
   - Troubleshooting guide

## Documentation

Complete documentation available at:
- `scripts/README.md` - Full usage guide with examples
- This file - Update summary and quick reference

## Next Steps

To use the updated script:

1. **Ensure database exists:**
   ```bash
   node backend/server.js
   ```
   (Run once to create/update database schema)

2. **Add scores:**
   ```bash
   node scripts/add-score.js "Player" 90 Pro --daily
   ```

3. **View leaderboards:**
   Visit the game and click "🏆 View Leaderboard"

## Support

For issues or questions:
- Check `scripts/README.md` for detailed documentation
- Verify database exists (`leaderboard.db`)
- Ensure server has run at least once
- Check console output for validation errors
