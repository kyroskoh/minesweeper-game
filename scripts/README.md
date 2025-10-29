# Minesweeper Helper Scripts

This directory contains utility scripts for managing the Minesweeper game's leaderboard database.

## Available Scripts

1. **add-score.js** - Manually add scores to the leaderboard
2. **migrate-scores.js** - Move/migrate scores between regular and daily puzzle categories
3. **sync-historical.js** - Sync existing daily scores to historical daily databases

---

# 1. Add Score Script

## Overview
The `add-score.js` script allows you to manually add scores to the Minesweeper leaderboard database. This is useful for testing, importing scores, or manually adding achievements.

## Features
- ✅ Add scores for all 6 difficulty levels
- ✅ Support for Daily Puzzle scores
- ✅ Flexible time input formats
- ✅ Custom date support
- ✅ Automatic validation
- ✅ Shows top 5 after adding

## Usage

### Basic Command
```bash
# Direct usage
node scripts/add-score.js <name> <time> <difficulty> [date] [--daily] [--device-id=<id>] [--overwrite]

# Via npm (note the -- before flags)
npm run add-score -- <name> <time> <difficulty> [date] [--daily] [--device-id=<id>] [--overwrite]
```

### Parameters

| Parameter | Required | Description | Examples |
|-----------|----------|-------------|----------|
| `name` | Yes | Player name (max 20 characters) | "John Doe", "SpeedRunner" |
| `time` | Yes | Time in seconds or mm:ss format | 45, 3:45, 1:30:25 |
| `difficulty` | Yes | Difficulty level | Easy, Medium, Hard, Pro, Expert, Extreme |
| `date` | No | Date of achievement (defaults to today) | 2025-10-15, 10/15/2025 |
| `--daily` | No | Flag to mark as daily puzzle score | --daily |
| `--device-id=<id>` | No | Device ID for tracking multiple players with same name | --device-id=device_123 |
| `--overwrite` | No | Update existing score instead of creating duplicate | --overwrite |

### Important: Using npm run

When using `npm run add-score`, you **must** include `--` before any flags:

```bash
# ✅ Correct
npm run add-score -- "Player" 90 Easy --daily

# ❌ Wrong (flags will be ignored)
npm run add-score "Player" 90 Easy --daily
```

### Difficulty Levels
- **Easy** (10×10, 10 mines)
- **Medium** (15×15, 25 mines)
- **Hard** (20×20, 40 mines)
- **Pro** (30×30, 50 mines)
- **Expert** (40×40, 100 mines)
- **Extreme** (50×50, 150 mines)

## Examples

### Regular Game Scores

#### Basic usage (defaults to today's date)
```bash
node scripts/add-score.js "John Doe" 45 Easy

# Or via npm
npm run add-score -- "John Doe" 45 Easy
```
Output:
```
📝 Adding score to leaderboard...
   Name: John Doe
   Time: 45s (45s)
   Difficulty: Easy
   Type: 🎮 Regular Game
   Date: 10/28/2025
   Device ID: (none - legacy score)
✅ Score added to main leaderboard!
```

#### Using mm:ss format
```bash
node scripts/add-score.js "Jane Smith" 3:45 Medium
```
Converts 3:45 to 225 seconds.

#### Using h:mm:ss format for long games
```bash
node scripts/add-score.js "Marathon Player" 1:30:45 Extreme
```
Converts 1:30:45 to 5445 seconds.

#### With custom date (YYYY-MM-DD format)
```bash
node scripts/add-score.js "Pro Player" 2:30 Hard "2025-10-15"
```

#### With custom date (MM/DD/YYYY format)
```bash
node scripts/add-score.js "Speed Runner" 90 Pro "10/15/2025"
```

### Daily Puzzle Scores

#### Add today's daily puzzle score
```bash
node scripts/add-score.js "Daily Winner" 90 Pro --daily

# Or via npm (note the --)
npm run add-score -- "Daily Winner" 90 Pro --daily
```
Output:
```
📝 Adding score to leaderboard...
   Name: Daily Winner
   Time: 01m30s (90s)
   Difficulty: Pro
   Type: 📅 Daily Puzzle
   Date: 10/28/2025
   Device ID: (none - legacy score)
✅ Score added to main leaderboard!
✅ Score archived to historical database: historical_daily_leaderboard_20251028.db

🏆 Top 5 - Pro (📅 Daily Puzzle):
   1. Speed Runner - 01m15s (75s)
   2. Daily Winner - 01m30s (90s)
   3. Challenge Master - 02m00s (120s)
```

#### Add past daily puzzle score with date
```bash
node scripts/add-score.js "Champion" 5:30 Expert "2025-10-15" --daily

# Or via npm
npm run add-score -- "Champion" 5:30 Expert "2025-10-15" --daily
```

#### Daily flag can be anywhere after difficulty
```bash
node scripts/add-score.js "Winner" 120 Medium --daily "2025-10-15"
npm run add-score -- "Winner" 120 Medium "2025-10-15" --daily
```

#### With device ID (for tracking multiple players with same name)
```bash
node scripts/add-score.js "Alice" 60 Easy --device-id=device_1234567890_abc123
node scripts/add-score.js "Alice" 65 Easy --device-id=device_9876543210_xyz789

# Or via npm (note the --)
npm run add-score -- "Alice" 60 Easy --device-id=device_1234567890_abc123
npm run add-score -- "Alice" 65 Easy --device-id=device_9876543210_xyz789
```
This will show as:
```
1. Alice (1) - 60s
2. Alice (2) - 65s
```

#### With device ID and daily flag together
```bash
node scripts/add-score.js "Wilnice" 9 Easy "2025-10-29" --daily --device-id=device_1761756531027_hzjbe5ijh

# Or via npm (IMPORTANT: use -- before flags!)
npm run add-score -- "Wilnice" 9 Easy "2025-10-29" --daily --device-id=device_1761756531027_hzjbe5ijh
```
Output:
```
📝 Adding score to leaderboard...
   Name: Wilnice
   Time: 09s (9s)
   Difficulty: Easy
   Type: 📅 Daily Puzzle
   Date: 10/29/2025
   Device ID: device_1761756531027_hzjbe5ijh
✅ Score added to main leaderboard!
✅ Score archived to historical database: historical_daily_leaderboard_20251029.db
```

#### Using --overwrite to update existing scores
```bash
# Initial score
node scripts/add-score.js "John" 45 Easy

# Update John's score for today (same name, difficulty, date, and type)
node scripts/add-score.js "John" 40 Easy --overwrite

# Or via npm
npm run add-score -- "John" 40 Easy --overwrite
```
Output:
```
📝 Adding score to leaderboard...
   Name: John
   Time: 40s (40s)
   Difficulty: Easy
   Type: 🎮 Regular Game
   Date: 10/29/2025
   Device ID: (none - legacy score)

🔄 Updated existing score:
   Old time: 45s (45s)
   New time: 40s (40s)
   Old device ID: (none - legacy score)
   New device ID: (none - legacy score)
✅ Score updated in main leaderboard!
```

**Note**: --overwrite matches scores by name, difficulty, date (YYYY-MM-DD), and type (daily/regular).
If no matching score exists, it will insert a new one.

## Time Input Formats

### Seconds
```bash
45          # 45 seconds
120         # 2 minutes
3600        # 1 hour
```

### Minutes:Seconds (mm:ss)
```bash
3:45        # 3 minutes 45 seconds (225s)
10:30       # 10 minutes 30 seconds (630s)
0:45        # 45 seconds
```

### Hours:Minutes:Seconds (h:mm:ss)
```bash
1:30:45     # 1 hour 30 minutes 45 seconds (5445s)
2:00:00     # 2 hours (7200s)
0:05:30     # 5 minutes 30 seconds (330s)
```

## Date Input Formats

The script accepts various date formats:

```bash
# ISO format
"2025-10-15"
"2025-10-28"

# US format
"10/15/2025"
"10/28/2025"

# Other formats
"October 15, 2025"
"15 Oct 2025"
```

## Validation

The script validates:
- ✅ Name is not empty and ≤ 20 characters
- ✅ Difficulty is one of: Easy, Medium, Hard, Pro, Expert, Extreme
- ✅ Time is a positive number
- ✅ Time format is valid (seconds or mm:ss or h:mm:ss)
- ✅ Date is valid if provided
- ✅ Database file exists

### Error Examples

#### Invalid difficulty
```bash
node scripts/add-score.js "John" 45 "Impossible"
```
Output:
```
❌ Error: Invalid difficulty "Impossible"
Valid difficulties: Easy, Medium, Hard, Pro, Expert, Extreme
```

#### Invalid time format
```bash
node scripts/add-score.js "John" "abc" Easy
```
Output:
```
❌ Error: Time must be a number (in seconds)
```

#### Name too long
```bash
node scripts/add-score.js "ThisNameIsWayTooLongForTheDatabase" 45 Easy
```
Output:
```
❌ Error: Name cannot be longer than 20 characters
```

## Leaderboard Display

After adding a score, the script shows the top 5 for that difficulty and type:

### Regular Game Top 5
```
🏆 Top 5 - Pro (🎮 Regular):
   1. Speed Runner - 01m15s (75s)
   2. Pro Player - 01m30s (90s)
   3. Champion - 02m00s (120s)
   4. Master - 02m15s (135s)
   5. Expert - 02m30s (150s)
```

### Daily Puzzle Top 5
```
🏆 Top 5 - Expert (📅 Daily Puzzle):
   1. Daily Champion - 05m30s (330s)
   2. Daily Winner - 06m00s (360s)
   3. Daily Player - 07m15s (435s)
```

## Database Schema

The script adds scores to the `leaderboard` table with the following schema:

```sql
CREATE TABLE leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  time INTEGER NOT NULL,
  difficulty TEXT NOT NULL,
  date TEXT NOT NULL,
  is_daily INTEGER DEFAULT 0
);
```

### Fields:
- `id` - Auto-incrementing unique identifier
- `name` - Player name (max 20 characters)
- `time` - Time in seconds
- `difficulty` - One of: Easy, Medium, Hard, Pro, Expert, Extreme
- `date` - ISO 8601 date string
- `is_daily` - 0 for regular games, 1 for daily puzzles

---

# 2. Score Migration Tool

## Overview
The `migrate-scores.js` script helps fix scores that were incorrectly categorized as daily or regular due to bugs. It allows you to move scores between these categories.

**Important**: When migrating TO daily, scores are automatically archived to historical databases!

## Usage

```bash
npm run migrate-scores
# or
node scripts/migrate-scores.js
```

## Features

### 1. View All Scores
Shows all scores grouped by type (Regular/Daily):
```
📊 Current Scores:

🎮 REGULAR GAME SCORES:
──────────────────────────────────────────────────────────────────────
  [ID:1] Player1 [device_123...] - 01m30s (Easy) - 10/28/2025
  [ID:3] Player2 [device_456...] - 02m15s (Medium) - 10/28/2025

📅 DAILY PUZZLE SCORES:
──────────────────────────────────────────────────────────────────────
  [ID:2] Player3 [device_789...] - 03m00s (Hard) - 10/28/2025
```

### 2. Move Regular to Daily
Migrates regular game scores to daily puzzle category and archives to historical databases.

### 3. Move Daily to Regular
Migrates daily puzzle scores to regular game category.
**Note**: Historical databases are preserved (not deleted).

### 4. Move by Score ID
Migrate a specific score by its database ID.

### 5. Move by Name and Date
Find and migrate scores by player name and/or date.

## Detailed Examples

### Example 1: View All Scores First
**Always start by viewing what you have:**

```bash
$ npm run migrate-scores

🔄 Minesweeper Score Migration Tool

Select an operation:
  1) View all scores (grouped by type)
  2) Move scores from Regular to Daily
  3) Move scores from Daily to Regular
  4) Move specific score by ID
  5) Move scores by name and date
  6) Exit

Enter your choice (1-6): 1

📊 Current Scores:

🎮 REGULAR GAME SCORES (15 total):
──────────────────────────────────────────────────────────────────────
  [ID:1] Alice [device_123...] - 45s (Easy) - 10/28/2025
  [ID:3] Bob [device_456...] - 01m30s (Medium) - 10/28/2025
  [ID:5] Charlie [legacy] - 02m00s (Hard) - 10/27/2025
  ...

📅 DAILY PUZZLE SCORES (8 total):
──────────────────────────────────────────────────────────────────────
  [ID:2] Dana [device_789...] - 01m15s (Easy) - 10/28/2025
  [ID:4] Eve [device_012...] - 03m30s (Expert) - 10/28/2025
  ...
```

### Example 2: Migrate All Regular Scores to Daily
**Scenario**: You accidentally ran regular games on a daily puzzle seed.

```bash
Enter your choice (1-6): 2

🔄 Move scores from Regular to Daily

Found 15 Regular score(s):

  1) [ID:1] Alice [device_123...] - 45s (Easy) - 10/28/2025
  2) [ID:3] Bob [device_456...] - 01m30s (Medium) - 10/28/2025
  3) [ID:5] Charlie [legacy] - 02m00s (Hard) - 10/27/2025
  ...

Options:
  - Enter score numbers to migrate (e.g., "1,3,5" or "1-5")
  - Enter "all" to migrate all scores
  - Enter "cancel" to go back

Enter your selection: all

⚠️  About to migrate 15 score(s) from Regular to Daily:
  • Alice - 45s (Easy) - 10/28/2025
  • Bob - 01m30s (Medium) - 10/28/2025
  • Charlie - 02m00s (Hard) - 10/27/2025
  ...

Proceed with migration? (yes/no): yes

✅ Successfully migrated 15 score(s)!
✅ Archived 15 score(s) to historical database!

Press Enter to continue...
```

**Result**: All 15 scores are now daily puzzles AND archived to their respective date's historical database!

### Example 3: Migrate Specific Scores by Selection
**Scenario**: Only some scores from yesterday need to be fixed.

```bash
Enter your choice (1-6): 2

Found 10 Regular score(s):

  1) [ID:10] John - 01m30s (Easy) - 10/28/2025
  2) [ID:11] Jane - 02m00s (Easy) - 10/28/2025
  3) [ID:12] Bob - 03m00s (Medium) - 10/27/2025  ← Fix this
  4) [ID:13] Alice - 04m00s (Medium) - 10/27/2025  ← Fix this
  5) [ID:14] Tom - 05m00s (Hard) - 10/27/2025  ← Fix this
  6) [ID:15] Sara - 06m00s (Hard) - 10/26/2025
  ...

Enter your selection: 3-5

⚠️  About to migrate 3 score(s) from Regular to Daily:
  • Bob - 03m00s (Medium) - 10/27/2025
  • Alice - 04m00s (Medium) - 10/27/2025
  • Tom - 05m00s (Hard) - 10/27/2025

Proceed with migration? (yes/no): yes

✅ Successfully migrated 3 score(s)!
✅ Archived 3 score(s) to historical database!
```

**Result**: Only Bob, Alice, and Tom's scores from 10/27 are migrated to daily and archived.

### Example 4: Migrate by Name and Date
**Scenario**: Fix all of John's scores from a specific date.

```bash
Enter your choice (1-6): 5

🔍 Migrate Scores by Name and Date

Enter player name (or partial name): John
Enter date (YYYY-MM-DD) or leave empty for all dates: 2025-10-27

Found 4 matching score(s):

  1) [ID:10] John Doe [device_abc...] - 01m30s (Easy) - 10/27/2025 - 🎮 Regular
  2) [ID:12] Johnny [device_def...] - 02m00s (Medium) - 10/27/2025 - 📅 Daily
  3) [ID:15] John Smith [device_ghi...] - 03m00s (Hard) - 10/27/2025 - 🎮 Regular
  4) [ID:18] John Jr [legacy] - 04m00s (Pro) - 10/27/2025 - 🎮 Regular

Options:
  - Enter score numbers to migrate (e.g., "1,3,5" or "1-5")
  - Enter "all" to migrate all scores
  - Enter "cancel" to go back

Enter your selection: 1,3,4

⚠️  About to migrate 3 score(s):
  • John Doe (Regular → Daily): 01m30s (Easy) - 10/27/2025
  • John Smith (Regular → Daily): 03m00s (Hard) - 10/27/2025
  • John Jr (Regular → Daily): 04m00s (Pro) - 10/27/2025

Proceed with migration? (yes/no): yes

✅ Successfully migrated 3 score(s)!
✅ Archived 3 score(s) to historical database!
```

**Result**: John Doe, John Smith, and John Jr's scores from 10/27 are now daily puzzles. Johnny's score is unchanged (already daily).

### Example 5: Migrate Single Score by ID
**Scenario**: You know the exact ID of the misclassified score.

```bash
Enter your choice (1-6): 4

🔍 Migrate Score by ID

Enter score ID: 42

Score Details:
  Name: SpeedRunner
  Time: 02m45s
  Difficulty: Expert
  Date: 10/28/2025
  Device ID: device_xyz123...
  Current Type: Regular
  Will become: Daily

Proceed with migration? (yes/no): yes

✅ Score migrated from Regular to Daily!
✅ Score archived to historical database!
```

### Example 6: Fix Incorrectly Marked Daily Scores
**Scenario**: Some regular games were accidentally marked as daily.

```bash
Enter your choice (1-6): 3

🔄 Move scores from Daily to Regular

Found 5 Daily score(s):

  1) [ID:20] TestPlayer [device_test...] - 30s (Easy) - 10/28/2025  ← This was a test
  2) [ID:21] TestPlayer [device_test...] - 35s (Easy) - 10/28/2025  ← This was a test
  3) [ID:22] RealPlayer [device_real...] - 01m45s (Medium) - 10/28/2025  ← Keep as daily
  4) [ID:23] ProPlayer [device_pro...] - 05m30s (Expert) - 10/28/2025  ← Keep as daily
  5) [ID:24] NewPlayer [device_new...] - 10m00s (Extreme) - 10/28/2025  ← Keep as daily

Enter your selection: 1,2

⚠️  About to migrate 2 score(s) from Daily to Regular:
  • TestPlayer - 30s (Easy) - 10/28/2025
  • TestPlayer - 35s (Easy) - 10/28/2025

Proceed with migration? (yes/no): yes

✅ Successfully migrated 2 score(s)!
```

**Result**: Test scores are now regular games. Historical databases preserve the original daily scores.

### Example 7: Migrate by Partial Name Match
**Scenario**: Find all variations of a player's name.

```bash
Enter your choice (1-6): 5

Enter player name (or partial name): alex
Enter date (YYYY-MM-DD) or leave empty for all dates: 

Found 6 matching score(s):

  1) [ID:30] Alex - 01m00s (Easy) - 10/28/2025 - 🎮 Regular
  2) [ID:31] Alexander - 01m30s (Medium) - 10/28/2025 - 🎮 Regular
  3) [ID:32] Alexandra - 02m00s (Hard) - 10/27/2025 - 📅 Daily
  4) [ID:33] Alex_Pro - 03m00s (Pro) - 10/27/2025 - 🎮 Regular
  5) [ID:34] Alexis - 04m00s (Expert) - 10/26/2025 - 🎮 Regular
  6) [ID:35] Alex2025 - 05m00s (Extreme) - 10/26/2025 - 🎮 Regular

Enter your selection: 1,2,4

⚠️  About to migrate 3 score(s):
  • Alex (Regular → Daily): 01m00s (Easy) - 10/28/2025
  • Alexander (Regular → Daily): 01m30s (Medium) - 10/28/2025
  • Alex_Pro (Regular → Daily): 03m00s (Pro) - 10/27/2025

Proceed with migration? (yes/no): yes

✅ Successfully migrated 3 score(s)!
✅ Archived 3 score(s) to historical database!
```

### Selection Syntax

- **Single scores**: `1` or `1,3,5`
- **Range**: `1-5` (migrates scores 1 through 5)
- **All**: `all` (migrates all listed scores)
- **Cancel**: `cancel` (abort operation)

### Safety Features

- ✅ Shows preview before migration
- ✅ Requires confirmation
- ✅ Displays score details
- ✅ Shows old and new type
- ✅ Creates backup automatically

## Common Use Cases

### Use Case 1: Daily Puzzle Bug Fix
**Problem**: Yesterday's daily puzzle scores were saved as regular games.

**Solution**:
```bash
npm run migrate-scores
# Option 5: Migrate by name and date
# Enter date: 2025-10-27
# Review scores for that date
# Select all that should be daily
# Confirm migration
```

### Use Case 2: Test Data Cleanup
**Problem**: Test scores were marked as daily puzzles.

**Solution**:
```bash
npm run migrate-scores
# Option 3: Move Daily to Regular
# Find test player scores
# Select them (e.g., "1-10")
# Confirm migration
```

### Use Case 3: Wrong Player Names
**Problem**: Player submitted scores under different name variations.

**Solution**:
```bash
npm run migrate-scores
# Option 5: Migrate by name
# Enter partial name: "john"
# Review all matches
# Migrate as needed
```

### Use Case 4: Date-Specific Migration
**Problem**: All scores from October 25 need to be daily.

**Solution**:
```bash
npm run migrate-scores
# Option 5: Migrate by name and date
# Leave name empty (or enter wildcard)
# Enter date: 2025-10-25
# Select all: "all"
# Confirm migration
```

### Use Case 5: Single Score Fix
**Problem**: One specific score (ID 42) needs to be fixed.

**Solution**:
```bash
npm run migrate-scores
# Option 4: Migrate by ID
# Enter ID: 42
# Review details
# Confirm migration
```

## Troubleshooting

### Database not found
```
❌ Error: Database file not found. Please start the server at least once to create the database.
```
**Solution:** Run the game server first to create the database:
```bash
node backend/server.js
```

### Permission denied
**Solution:** Make sure you have write permissions to the project directory.

### Invalid difficulty after update
If you see "Invalid difficulty" for Pro:
**Solution:** Make sure you're using the updated script version that includes Pro difficulty.

## Bulk Import Example

You can create a shell script to import multiple scores:

### Windows (PowerShell)
```powershell
# import-scores.ps1
node scripts/add-score.js "Player1" 45 Easy
node scripts/add-score.js "Player2" 90 Medium
node scripts/add-score.js "Player3" 3:30 Hard
node scripts/add-score.js "Player4" 5:00 Pro --daily
node scripts/add-score.js "Player5" 10:00 Expert --daily
```

### Linux/Mac (Bash)
```bash
#!/bin/bash
# import-scores.sh
node scripts/add-score.js "Player1" 45 Easy
node scripts/add-score.js "Player2" 90 Medium
node scripts/add-score.js "Player3" 3:30 Hard
node scripts/add-score.js "Player4" 5:00 Pro --daily
node scripts/add-score.js "Player5" 10:00 Expert --daily
```

## Testing Scenarios

### Test all difficulties
```bash
node scripts/add-score.js "Tester" 30 Easy
node scripts/add-score.js "Tester" 60 Medium
node scripts/add-score.js "Tester" 120 Hard
node scripts/add-score.js "Tester" 180 Pro
node scripts/add-score.js "Tester" 300 Expert
node scripts/add-score.js "Tester" 600 Extreme
```

### Test daily puzzle for all difficulties
```bash
node scripts/add-score.js "Daily" 40 Easy --daily
node scripts/add-score.js "Daily" 70 Medium --daily
node scripts/add-score.js "Daily" 140 Hard --daily
node scripts/add-score.js "Daily" 200 Pro --daily
node scripts/add-score.js "Daily" 350 Expert --daily
node scripts/add-score.js "Daily" 700 Extreme --daily
```

### Test different time formats
```bash
node scripts/add-score.js "Format1" 45 Easy           # Seconds
node scripts/add-score.js "Format2" 1:30 Medium       # mm:ss
node scripts/add-score.js "Format3" 0:45 Hard         # mm:ss
node scripts/add-score.js "Format4" 1:30:45 Expert    # h:mm:ss
```

---

# 3. Sync Historical Daily Leaderboard

## Overview
The `sync-historical.js` script synchronizes existing daily puzzle scores from the main `leaderboard.db` into their respective historical daily databases.

**When to use**: After implementing the historical daily feature, or to recover from data loss.

## Quick Start

```bash
npm run sync-historical
# or
node scripts/sync-historical.js
```

## Features

- 📋 **Preview Mode**: See what will be synced without making changes
- 🔄 **Sync All**: Process all daily scores at once
- 🎯 **Selective Sync**: Choose specific dates to sync
- ✅ **Duplicate Detection**: Automatically skips existing scores
- 📊 **Detailed Reporting**: Shows progress and summary

## Detailed Examples

See [SYNC_HISTORICAL.md](SYNC_HISTORICAL.md) for comprehensive documentation with 7 detailed examples covering:
- Initial setup with preview
- Syncing all scores
- Selective date syncing
- Re-running with existing data
- Recovery scenarios
- Integration with other scripts

### Quick Example: First-Time Sync

```bash
$ npm run sync-historical

✅ Found 127 daily puzzle score(s) across 15 date(s)

Options:
  1) Preview what will be synced (dry run)
  2) Sync all scores to historical databases
  3) Sync specific date(s) only
  4) Exit

Select an option (1-4): 1  # Preview first

# Review output...

Select an option (1-4): 2  # Then sync

Proceed with sync? (yes/no): yes

🚀 Starting sync...

✅ Sync Complete!

📊 Summary:
   Total scores processed: 127
   Successfully added: 127
   Skipped (duplicates): 0
   New databases created: 15
```

## Selection Syntax

- **Single dates**: `5` or `10`
- **Multiple dates**: `1,5,10,15`
- **Range**: `1-10` (dates 1 through 10)
- **Mixed**: `1,3-5,8,10-15`
- **All**: `all` (sync everything)

## Common Scenarios

### Initial Deployment
You just pushed the historical feature to production.
```bash
npm run sync-historical
# Preview → Sync all
```

### After Data Import
Imported old scores from backup.
```bash
npm run sync-historical
# Review → Sync needed dates
```

### Recovery from Deletion
Accidentally deleted historical databases.
```bash
npm run sync-historical
# Sync all to recreate
```

## Notes About All Scripts

- Scores are immediately added to the database
- **add-score.js**: 
  - By default, creates new scores without duplicate checking
  - With `--overwrite` flag, updates existing scores matching name/difficulty/date/type
  - Auto-archives daily scores to historical databases
- **migrate-scores.js**: Has duplicate detection, auto-archives to historical when migrating to daily
- **sync-historical.js**: Automatically skips duplicates, safe to run multiple times
- The leaderboard in the game will show all scores in the database
- Daily puzzle scores and regular scores are tracked separately
- Historical databases preserve daily puzzle scores by date (SGT timezone)

## --overwrite Flag Behavior

The `--overwrite` flag in `add-score.js` matches scores based on:
- Player name (exact match, case-sensitive)
- Difficulty (exact match)
- Date (YYYY-MM-DD format, ignoring time)
- Type (daily puzzle vs regular game)

**Examples:**
- ✅ Will overwrite: Same name, same difficulty, same date, same type
- ❌ Won't overwrite: Different name, or different difficulty, or different date, or different type
- If no match found, a new score is inserted instead
