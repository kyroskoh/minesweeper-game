# Add Score Script Documentation

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
node scripts/add-score.js <name> <time> <difficulty> [date] [--daily] [--device-id=<id>]
```

### Parameters

| Parameter | Required | Description | Examples |
|-----------|----------|-------------|----------|
| `name` | Yes | Player name (max 20 characters) | "John Doe", "SpeedRunner" |
| `time` | Yes | Time in seconds or mm:ss format | 45, 3:45, 1:30:25 |
| `difficulty` | Yes | Difficulty level | Easy, Medium, Hard, Pro, Expert, Extreme |
| `date` | No | Date of achievement (defaults to today) | 2025-10-15, 10/15/2025 |
| `--daily` | No | Flag to mark as daily puzzle score | --daily |
| `--device-id=<id>` | No | Device ID for tracking multiple players with same name | --device-id=device_1234567890_abc |

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
```
Output:
```
📝 Adding score to leaderboard...
   Name: John Doe
   Time: 45s (45s)
   Difficulty: Easy
   Type: 🎮 Regular Game
   Date: 10/28/2025
✅ Score added successfully!
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

🏆 Top 5 - Pro (📅 Daily Puzzle):
   1. Speed Runner - 01m15s (75s)
   2. Daily Winner - 01m30s (90s)
   3. Challenge Master - 02m00s (120s)
```

#### Add past daily puzzle score with date
```bash
node scripts/add-score.js "Champion" 5:30 Expert "2025-10-15" --daily
```

#### Daily flag can be anywhere after difficulty
```bash
node scripts/add-score.js "Winner" 120 Medium --daily "2025-10-15"
```

#### With device ID (for tracking multiple players with same name)
```bash
node scripts/add-score.js "Alice" 60 Easy --device-id=device_1234567890_abc123
node scripts/add-score.js "Alice" 65 Easy --device-id=device_9876543210_xyz789
```
This will show as:
```
1. Alice (1) - 60s
2. Alice (2) - 65s
```

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

## Score Migration Tool

### Overview
The `migrate-scores.js` script helps fix scores that were incorrectly categorized as daily or regular due to bugs. It allows you to move scores between these categories.

### Usage

```bash
node scripts/migrate-scores.js
```

### Features

#### 1. View All Scores
Shows all scores grouped by type (Regular/Daily):
```
📊 Current Scores:

🎮 REGULAR GAME SCORES:
──────────────────────────────────────────────────────────────────────
  [ID:1] Player1 - 01m30s (Easy) - 10/28/2025
  [ID:3] Player2 - 02m15s (Medium) - 10/28/2025

📅 DAILY PUZZLE SCORES:
──────────────────────────────────────────────────────────────────────
  [ID:2] Player3 - 03m00s (Hard) - 10/28/2025
```

#### 2. Move Regular to Daily
Migrates regular game scores to daily puzzle category:
```bash
# Select from menu option 2
# Choose specific scores or "all"
```

#### 3. Move Daily to Regular
Migrates daily puzzle scores to regular game category:
```bash
# Select from menu option 3
```

#### 4. Move by Score ID
Migrate a specific score by its database ID:
```bash
# Select menu option 4
# Enter the score ID
```

#### 5. Move by Name and Date
Find and migrate scores by player name and/or date:
```bash
# Select menu option 5
# Enter player name (partial matches work)
# Optionally filter by date (YYYY-MM-DD)
```

### Examples

#### Migrate All Regular Scores to Daily
```bash
$ node scripts/migrate-scores.js
Select an operation:
  1) View all scores (grouped by type)
  2) Move scores from Regular to Daily
  3) Move scores from Daily to Regular
  4) Move specific score by ID
  5) Move scores by name and date
  6) Exit

Enter your choice (1-6): 2

Found 5 Regular score(s):

  1) [ID:10] John Doe - 01m30s (Easy) - 10/28/2025
  2) [ID:11] Jane Smith - 02m00s (Medium) - 10/28/2025
  ...

Enter your selection: all

Proceed with migration? (yes/no): yes

✅ Successfully migrated 5 score(s)!
```

#### Migrate Specific Scores
```bash
Enter your selection: 1,3,5

⚠️  About to migrate 3 score(s) from Regular to Daily:
  • John Doe - 01m30s (Easy) - 10/28/2025
  • Bob Wilson - 03m00s (Hard) - 10/28/2025
  • Alice Brown - 05m30s (Expert) - 10/28/2025

Proceed with migration? (yes/no): yes
```

#### Migrate by Name
```bash
Enter player name (or partial name): John
Enter date (YYYY-MM-DD) or leave empty for all dates: 

Found 3 matching score(s):

  1) [ID:10] John Doe - 01m30s (Easy) - 10/28/2025 - 🎮 Regular
  2) [ID:15] Johnny - 02m00s (Medium) - 10/27/2025 - 📅 Daily
  3) [ID:20] John Smith - 03m00s (Hard) - 10/26/2025 - 🎮 Regular

Selection: 1,3
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

### Common Use Cases

#### Fix Yesterday's Daily Puzzle Scores
If scores were accidentally marked as regular:
```bash
# Option 5: Move by name and date
# Enter date: 2025-10-27
# Select all matching scores
```

#### Fix Regular Scores Marked as Daily
If someone's regular games were marked as daily:
```bash
# Option 3: Move Daily to Regular
# Enter their score numbers
```

#### Bulk Migration
Move all scores of a certain type:
```bash
# Option 2 or 3
# Enter: all
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

## Notes

- Scores are immediately added to the database
- No duplicate checking - you can add the same score multiple times
- The script shows only the top 5, but all scores are stored
- Regular game scores and daily puzzle scores are tracked separately
- The leaderboard in the game will show all scores in the database
