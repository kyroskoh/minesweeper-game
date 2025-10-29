# Daily Puzzle Timezone Configuration

## Overview
The daily puzzle system now uses **Singapore Time (SGT/UTC+8)** for determining when new puzzles become available.

## Why Singapore Time?

Singapore Time (SGT) was chosen as the reference timezone for the following reasons:
- **Consistent reset time** for all players worldwide
- **No daylight saving time** - SGT stays UTC+8 year-round
- **Central Asia-Pacific location** - reasonable time for most players
- **Stable and predictable** - no timezone rule changes

## How It Works

### Backend (Server)
The server calculates the daily seed using Singapore Time:

```javascript
function getDailySeed(difficulty = 'medium') {
  const now = new Date();
  
  // Convert to Singapore Time (UTC+8)
  const sgtOffset = 8 * 60; // 8 hours in minutes
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const sgtTime = new Date(utcTime + (sgtOffset * 60000));
  
  const year = sgtTime.getFullYear();
  const month = String(sgtTime.getMonth() + 1).padStart(2, '0');
  const day = String(sgtTime.getDate()).padStart(2, '0');
  
  // Generate seed based on SGT date
  const seedString = `${year}-${month}-${day}|${difficulty}|${SEED_SALT}`;
  // ... SHA-256 hashing
}
```

### Frontend (Client)
The UI displays dates in Singapore Time:

```javascript
const dateStr = today.toLocaleDateString('en-US', { 
  weekday: 'long',
  month: 'long', 
  day: 'numeric', 
  year: 'numeric',
  timeZone: 'Asia/Singapore'  // SGT
});
```

## Daily Reset Time

The daily puzzle resets at **midnight SGT (00:00 Singapore Time)**.

### Reset Times in Other Timezones

| Location | Reset Time |
|----------|------------|
| **Singapore (SGT)** | 00:00 (midnight) |
| **UTC** | 16:00 (4:00 PM) previous day |
| **New York (EST)** | 11:00 AM previous day |
| **New York (EDT)** | 12:00 PM (noon) previous day |
| **Los Angeles (PST)** | 08:00 AM previous day |
| **Los Angeles (PDT)** | 09:00 AM previous day |
| **London (GMT)** | 16:00 (4:00 PM) previous day |
| **London (BST)** | 17:00 (5:00 PM) previous day |
| **Tokyo (JST)** | 01:00 AM (1:00 AM) |
| **Sydney (AEST)** | 02:00 AM (2:00 AM) |
| **Sydney (AEDT)** | 03:00 AM (3:00 AM) |
| **Dubai (GST)** | 20:00 (8:00 PM) previous day |
| **Paris (CET)** | 17:00 (5:00 PM) previous day |
| **Paris (CEST)** | 18:00 (6:00 PM) previous day |

## Example: October 29, 2025

When does the October 29, 2025 daily puzzle become available?

- **Singapore**: October 29, 2025 at 00:00 SGT (midnight)
- **London**: October 28, 2025 at 16:00 GMT (4:00 PM)
- **New York**: October 28, 2025 at 11:00 EST (11:00 AM)
- **Los Angeles**: October 28, 2025 at 08:00 PST (8:00 AM)
- **Tokyo**: October 29, 2025 at 01:00 JST (1:00 AM)
- **Sydney**: October 29, 2025 at 03:00 AEDT (3:00 AM)

## UI Indication

The daily puzzle modal displays:
```
🕐 Resets daily at midnight SGT (Singapore Time)
```

This helps users understand when the next puzzle will be available.

## Seed Generation

The seed is generated using:
1. **SGT date** (YYYY-MM-DD format)
2. **Difficulty** (easy, medium, hard, pro, expert, extreme)
3. **Secret salt** (server-side only)

Formula:
```
seed = SHA256(YYYY-MM-DD|difficulty|SECRET_SALT)
```

Example for October 29, 2025, Easy difficulty:
```
Input: "2025-10-29|easy|minesweeper-daily-puzzle-salt-2025"
SHA256: a3f4c8d2... (64 hex characters)
Seed: First 8 hex chars converted to integer
```

## Benefits

### For Players
✅ **Predictable reset time** - Know exactly when new puzzle arrives
✅ **Fair competition** - Everyone gets the same puzzle at the same time
✅ **No confusion** - Single global reference time
✅ **Year-round consistency** - No daylight saving surprises

### For Developers
✅ **Simple calculation** - No complex timezone logic
✅ **No DST bugs** - SGT never changes
✅ **Stable seed generation** - Same input always produces same output
✅ **Easy testing** - Predictable behavior

## Testing

### Check Current SGT Time
```bash
# Using Node.js
node -e "console.log(new Date().toLocaleString('en-US', {timeZone: 'Asia/Singapore'}))"
```

### Test Seed Generation
```bash
# Start server and make API call
curl -X POST http://localhost:3030/api/game/daily \
  -H "Content-Type: application/json" \
  -d '{"difficulty":"easy"}'
```

The response will include the `seed` generated for today (SGT).

## Migration Notes

### Before (UTC)
```javascript
const year = today.getUTCFullYear();
const month = today.getUTCMonth() + 1;
const day = today.getUTCDate();
```

### After (SGT)
```javascript
// Convert to Singapore Time (UTC+8)
const sgtOffset = 8 * 60;
const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
const sgtTime = new Date(utcTime + (sgtOffset * 60000));

const year = sgtTime.getFullYear();
const month = sgtTime.getMonth() + 1;
const day = sgtTime.getDate();
```

## Future Enhancements

Possible improvements:
- Display countdown to next puzzle
- Show user's local reset time
- Add timezone selector for display (still uses SGT for logic)
- Show multiple timezone reset times in modal

## FAQ

**Q: Can I change the timezone?**
A: Yes, modify `sgtOffset` in `getDailySeed()` function. Remember to update UI text too.

**Q: Why not use the user's local timezone?**
A: Everyone needs the same puzzle at the same time for fair competition.

**Q: What if I'm traveling?**
A: The puzzle is based on SGT, not your location. You'll get the same puzzle as everyone else.

**Q: How do I know when the next puzzle is available?**
A: Check the modal: "Resets daily at midnight SGT". Calculate your local time from SGT.

**Q: Can the server and client be in different timezones?**
A: Yes! Both use SGT internally, regardless of server/client location.

## Technical Details

### Timezone Offset Calculation
```javascript
const sgtOffset = 8 * 60; // 8 hours = 480 minutes
```

### UTC to SGT Conversion
```javascript
const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
const sgtTime = new Date(utcTime + (sgtOffset * 60000));
```

### Why Use Milliseconds?
- JavaScript `getTime()` returns milliseconds since epoch
- Multiply minutes by 60000 to get milliseconds
- Ensures accurate timezone conversion

## Support

If you encounter timezone-related issues:
1. Check server logs for generated seed
2. Verify server system time is correct
3. Confirm client displays SGT dates correctly
4. Test with multiple difficulties

## References

- [Singapore Time - Wikipedia](https://en.wikipedia.org/wiki/Singapore_Standard_Time)
- [JavaScript Date.toLocaleString()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleString)
- [IANA Time Zone Database](https://www.iana.org/time-zones)

