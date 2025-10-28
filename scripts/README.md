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
node scripts/add-score.js <name> <time> <difficulty> [date] [--daily]
```

### Parameters

| Parameter | Required | Description | Examples |
|-----------|----------|-------------|----------|
| `name` | Yes | Player name (max 20 characters) | "John Doe", "SpeedRunner" |
| `time` | Yes | Time in seconds or mm:ss format | 45, 3:45, 1:30:25 |
| `difficulty` | Yes | Difficulty level | Easy, Medium, Hard, Pro, Expert, Extreme |
| `date` | No | Date of achievement (defaults to today) | 2025-10-15, 10/15/2025 |
| `--daily` | No | Flag to mark as daily puzzle score | --daily |

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
