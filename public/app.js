//const API_URL = 'http://localhost:3030/api';
// In the frontend/browser:
const API_URL = 'https://mine.kyros.party/api';

let gameId = null;
let gameState = null;
let flagsPlaced = 0;
let timerInterval = null;
let localStartTime = null;
let developerMode = false;
let keySequence = '';
let arrowSequence = [];
let minePositions = null;
let isDailyPuzzle = false;
const SECRET_CODE = 'showmines'; // Text code
const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']; // Konami code

const boardElement = document.getElementById('board');
const minesCountElement = document.getElementById('minesCount');
const flagsCountElement = document.getElementById('flagsCount');
const gameStatusElement = document.getElementById('gameStatus');
const timerElement = document.getElementById('timer');
const newGameBtn = document.getElementById('newGame');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const leaderboardModal = document.getElementById('leaderboardModal');
const closeModal = document.querySelector('.close');
const dailyPuzzleBtn = document.getElementById('dailyPuzzleBtn');
const dailyPuzzleModal = document.getElementById('dailyPuzzleModal');
const closeDailyModal = document.querySelector('.close-daily');

const difficulties = {
  easy: { rows: 10, cols: 10, mines: 10, name: 'Easy' },
  medium: { rows: 15, cols: 15, mines: 25, name: 'Medium' },
  hard: { rows: 20, cols: 20, mines: 40, name: 'Hard' },
  pro: { rows: 30, cols: 30, mines: 50, name: 'Pro' },
  expert: { rows: 40, cols: 40, mines: 100, name: 'Expert' },
  extreme: { rows: 50, cols: 50, mines: 150, name: 'Extreme' }
};

let currentDifficulty = 'medium';

// Initialize game
async function startNewGame() {
  isDailyPuzzle = false;
  const config = difficulties[currentDifficulty];
  
  try {
    const response = await fetch(`${API_URL}/game/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    
    const data = await response.json();
    gameId = data.gameId;
    gameState = data.state;
    flagsPlaced = 0;
    
    // Clear timer
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    localStartTime = null;
    timerElement.textContent = '0s';
    
    renderBoard();
    updateGameInfo();
    startTimer();
  } catch (error) {
    console.error('Error starting new game:', error);
    alert('Failed to connect to server. Make sure the server is running on port 3030.');
  }
}

// Start daily puzzle
async function startDailyPuzzle(difficulty) {
  isDailyPuzzle = true;
  currentDifficulty = difficulty;
  
  try {
    const response = await fetch(`${API_URL}/game/daily`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ difficulty })
    });
    
    const data = await response.json();
    gameId = data.gameId;
    gameState = data.state;
    flagsPlaced = 0;
    
    // Clear timer
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    localStartTime = null;
    timerElement.textContent = '0s';
    
    renderBoard();
    updateGameInfo();
    startTimer();
    
    // Update difficulty button states
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(difficulty)?.classList.add('active');
    
    hideDailyPuzzleModal();
  } catch (error) {
    console.error('Error starting daily puzzle:', error);
    alert('Failed to connect to server. Make sure the server is running on port 3030.');
  }
}

// Render the game board
function renderBoard() {
  if (!gameState) return;
  
  boardElement.innerHTML = '';
  
  // Dynamic cell size based on board dimensions
  let cellSize = 30;
  if (gameState.rows >= 50 || gameState.cols >= 50) {
    cellSize = 15;
  } else if (gameState.rows >= 40 || gameState.cols >= 40) {
    cellSize = 18;
  } else if (gameState.rows >= 30 || gameState.cols >= 30) {
    cellSize = 20;
  } else if (gameState.rows >= 20 || gameState.cols >= 20) {
    cellSize = 25;
  }
  
  boardElement.style.gridTemplateColumns = `repeat(${gameState.cols}, ${cellSize}px)`;
  boardElement.style.gridTemplateRows = `repeat(${gameState.rows}, ${cellSize}px)`;
  boardElement.dataset.cellSize = cellSize;
  
  for (let i = 0; i < gameState.rows; i++) {
    for (let j = 0; j < gameState.cols; j++) {
      const cell = createCell(i, j);
      boardElement.appendChild(cell);
    }
  }
}

// Create a single cell
function createCell(row, col) {
  const cell = document.createElement('div');
  cell.className = 'cell';
  cell.dataset.row = row;
  cell.dataset.col = col;
  
  const isRevealed = gameState.revealed[row][col];
  const isFlagged = gameState.flags[row][col];
  const value = gameState.values[row][col];
  const isHitMine = gameState.hitMineRow === row && gameState.hitMineCol === col;
  const hasMine = minePositions && minePositions[row] && minePositions[row][col] === -1;
  
  // Developer mode: show mine indicator on unrevealed cells
  if (developerMode && hasMine && !isRevealed) {
    cell.classList.add('dev-mine');
    cell.setAttribute('data-dev', '⚠️');
  }
  
  if (isFlagged) {
    cell.classList.add('flagged');
    cell.textContent = '🚩';
  } else if (isRevealed) {
    cell.classList.add('revealed');
    
    if (value === -1) {
      cell.classList.add('mine');
      // Highlight the mine that was clicked
      if (isHitMine) {
        cell.classList.add('hit-mine');
      }
      cell.textContent = '💣';
    } else if (value > 0) {
      cell.textContent = value;
      cell.classList.add(`cell-${value}`);
    }
  }
  
  // Event listeners
  cell.addEventListener('click', () => handleCellClick(row, col));
  cell.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    handleRightClick(row, col);
  });
  
  // Touch support for mobile (long press to flag)
  let touchTimer;
  let touchMoved = false;
  
  cell.addEventListener('touchstart', (e) => {
    touchMoved = false;
    touchTimer = setTimeout(() => {
      if (!touchMoved) {
        // Long press detected
        e.preventDefault();
        handleRightClick(row, col);
        // Vibrate if supported
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }, 500); // 500ms long press
  });
  
  cell.addEventListener('touchmove', () => {
    touchMoved = true;
    clearTimeout(touchTimer);
  });
  
  cell.addEventListener('touchend', (e) => {
    clearTimeout(touchTimer);
    if (!touchMoved && e.cancelable) {
      // Quick tap - don't let it trigger click event
      // The click event will handle the reveal
    }
  });
  
  return cell;
}

// Handle left click (reveal cell)
async function handleCellClick(row, col) {
  if (!gameId || gameState.gameOver || gameState.flags[row][col]) return;
  
  try {
    const response = await fetch(`${API_URL}/game/${gameId}/reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ row, col })
    });
    
    const data = await response.json();
    gameState = data.state;
    
    renderBoard();
    updateGameInfo();
    
    // Synchronize local timer with server time
    if (gameState.startTime && !localStartTime) {
      localStartTime = Date.now() - (gameState.elapsedTime * 1000);
    }
    
    // Update timer display immediately
    updateTimer();
    
    if (data.gameOver) {
      handleGameOver(data.won);
    }
  } catch (error) {
    console.error('Error revealing cell:', error);
  }
}

// Handle right click (toggle flag)
async function handleRightClick(row, col) {
  if (!gameId || gameState.gameOver || gameState.revealed[row][col]) return;
  
  try {
    const response = await fetch(`${API_URL}/game/${gameId}/flag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ row, col })
    });
    
    const data = await response.json();
    gameState = data.state;
    
    // Update flags count
    flagsPlaced = 0;
    for (let i = 0; i < gameState.rows; i++) {
      for (let j = 0; j < gameState.cols; j++) {
        if (gameState.flags[i][j]) flagsPlaced++;
      }
    }
    
    renderBoard();
    updateGameInfo();
  } catch (error) {
    console.error('Error toggling flag:', error);
  }
}

// Timer functions
function startTimer() {
  // Timer will start on first move, just update display
  if (!timerInterval) {
    timerInterval = setInterval(updateTimer, 100); // Update every 100ms for smoother display
  }
}

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

function updateTimer() {
  if (!gameState || gameState.gameOver) {
    return;
  }
  
  // Use synchronized local start time for smooth counting
  if (localStartTime) {
    const elapsed = Math.floor((Date.now() - localStartTime) / 1000);
    timerElement.textContent = formatTime(elapsed);
  }
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// Update game info display
function updateGameInfo() {
  if (!gameState) return;
  
  minesCountElement.textContent = gameState.minesCount;
  flagsCountElement.textContent = flagsPlaced;
  
  // Always update timer from server to avoid clock skew
  if (gameState.elapsedTime !== undefined) {
    timerElement.textContent = formatTime(gameState.elapsedTime);
  }
  
  if (gameState.gameOver) {
    gameStatusElement.textContent = gameState.won ? '🎉 You Won!' : '💥 Game Over';
    gameStatusElement.className = gameState.won ? 'status won' : 'status lost';
    stopTimer();
  } else {
    gameStatusElement.textContent = 'Playing';
    gameStatusElement.className = 'status';
  }
}

// Handle game over
async function handleGameOver(won) {
  if (won) {
    const time = gameState.elapsedTime;
    const difficulty = difficulties[currentDifficulty].name;
    const puzzleType = isDailyPuzzle ? 'Daily Puzzle' : difficulty;
    
    setTimeout(async () => {
      const playerName = prompt(`🎉 Congratulations! You won the ${puzzleType} in ${formatTime(time)}!\n\nEnter your name for the leaderboard:`);
      
      if (playerName && playerName.trim()) {
        const success = await submitScore(playerName.trim(), time, difficulty, isDailyPuzzle);
        if (success) {
          alert('Score saved to leaderboard!');
        } else {
          alert('⚠️ Score saved offline. It will sync when connection is restored.');
        }
      }
      
      if (isDailyPuzzle) {
        if (confirm('Play another difficulty of today\'s puzzle?')) {
          showDailyPuzzleModal();
        }
      } else {
        if (confirm('Start a new game?')) {
          startNewGame();
        }
      }
    }, 500);
  } else {
    setTimeout(() => {
      const puzzleType = isDailyPuzzle ? 'Daily Puzzle' : 'Game';
      if (confirm(`${puzzleType} Over! You hit a mine 💥\n\nTry again?`)) {
        if (isDailyPuzzle) {
          startDailyPuzzle(currentDifficulty);
        } else {
          startNewGame();
        }
      }
    }, 500);
  }
}

// Offline score queue management
function getOfflineScores() {
  const scores = localStorage.getItem('pendingScores');
  return scores ? JSON.parse(scores) : [];
}

function addOfflineScore(name, time, difficulty, isDailyPuzzle = false) {
  const scores = getOfflineScores();
  scores.push({
    name,
    time,
    difficulty,
    isDailyPuzzle,
    date: new Date().toISOString(),
    timestamp: Date.now()
  });
  localStorage.setItem('pendingScores', JSON.stringify(scores));
}

function clearOfflineScores() {
  localStorage.removeItem('pendingScores');
}

function removeOfflineScore(index) {
  const scores = getOfflineScores();
  scores.splice(index, 1);
  localStorage.setItem('pendingScores', JSON.stringify(scores));
}

// Sync pending scores to server
async function syncOfflineScores() {
  const pendingScores = getOfflineScores();
  
  if (pendingScores.length === 0) {
    return { success: true, synced: 0 };
  }
  
  console.log(`Syncing ${pendingScores.length} pending score(s)...`);
  
  let syncedCount = 0;
  const failedIndices = [];
  
  for (let i = 0; i < pendingScores.length; i++) {
    const score = pendingScores[i];
    try {
      const response = await fetch(`${API_URL}/leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: score.name,
          time: score.time,
          difficulty: score.difficulty,
          date: score.date,
          isDailyPuzzle: score.isDailyPuzzle || false
        })
      });
      
      if (response.ok) {
        syncedCount++;
      } else {
        failedIndices.push(i);
      }
    } catch (error) {
      console.error('Error syncing score:', error);
      failedIndices.push(i);
    }
  }
  
  // Keep only failed scores
  const failedScores = pendingScores.filter((_, index) => failedIndices.includes(index));
  localStorage.setItem('pendingScores', JSON.stringify(failedScores));
  
  if (syncedCount > 0) {
    console.log(`✅ Successfully synced ${syncedCount} score(s)`);
  }
  
  return { success: failedIndices.length === 0, synced: syncedCount, failed: failedIndices.length };
}

// Submit score to leaderboard
async function submitScore(name, time, difficulty, isDailyPuzzle = false) {
  try {
    const response = await fetch(`${API_URL}/leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        time, 
        difficulty,
        isDailyPuzzle,
        date: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error('Server returned error');
    }
    
    return true;
  } catch (error) {
    console.error('Error submitting score, saving offline:', error);
    addOfflineScore(name, time, difficulty, isDailyPuzzle);
    updateSyncIndicator();
    return false;
  }
}

// Difficulty buttons
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentDifficulty = btn.id;
    startNewGame();
  });
});

// New game button
newGameBtn.addEventListener('click', startNewGame);

// Daily puzzle modal functions
function showDailyPuzzleModal() {
  dailyPuzzleModal.classList.add('show');
}

function hideDailyPuzzleModal() {
  dailyPuzzleModal.classList.remove('show');
}

dailyPuzzleBtn.addEventListener('click', showDailyPuzzleModal);

closeDailyModal.addEventListener('click', hideDailyPuzzleModal);

window.addEventListener('click', (e) => {
  if (e.target === dailyPuzzleModal) {
    hideDailyPuzzleModal();
  }
});

// Daily difficulty buttons
document.querySelectorAll('.daily-diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const difficulty = btn.dataset.difficulty;
    startDailyPuzzle(difficulty);
  });
});

// Leaderboard functions
let currentLeaderboardTab = 'Easy';

async function loadLeaderboard(difficulty) {
  try {
    const response = await fetch(`${API_URL}/leaderboard`);
    const data = await response.json();
    
    if (difficulty === 'Daily') {
      // Show all daily puzzle scores across all difficulties
      const dailyScores = [];
      Object.keys(data.leaderboard).forEach(diff => {
        const scores = data.leaderboard[diff].filter(s => s.is_daily === 1);
        dailyScores.push(...scores);
      });
      // Sort by time
      dailyScores.sort((a, b) => a.time - b.time);
      displayLeaderboard(dailyScores.slice(0, 10), true);
    } else {
      displayLeaderboard(data.leaderboard[difficulty]);
    }
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    displayLeaderboard([]);
  }
}

function displayLeaderboard(scores, showDifficulty = false) {
  const content = document.getElementById('leaderboardContent');
  
  if (!scores || scores.length === 0) {
    content.innerHTML = '<div class="no-scores">No scores yet. Be the first!</div>';
    return;
  }
  
  let html = `
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Name</th>
          ${showDifficulty ? '<th>Difficulty</th>' : ''}
          <th>Time</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  scores.forEach((score, index) => {
    const date = new Date(score.date).toLocaleDateString();
    html += `
      <tr>
        <td>${index + 1}</td>
        <td>${score.name}</td>
        ${showDifficulty ? `<td>${score.difficulty}</td>` : ''}
        <td>${formatTimeWithTotal(score.time)}</td>
        <td>${date}</td>
      </tr>
    `;
  });
  
  html += '</tbody></table>';
  content.innerHTML = html;
}

function showLeaderboard() {
  leaderboardModal.classList.add('show');
  loadLeaderboard(currentLeaderboardTab);
}

function hideLeaderboard() {
  leaderboardModal.classList.remove('show');
}

// Event listeners for leaderboard
leaderboardBtn.addEventListener('click', showLeaderboard);

closeModal.addEventListener('click', hideLeaderboard);

window.addEventListener('click', (e) => {
  if (e.target === leaderboardModal) {
    hideLeaderboard();
  }
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentLeaderboardTab = btn.dataset.difficulty;
    loadLeaderboard(currentLeaderboardTab);
  });
});

// Check and sync pending scores on page load
window.addEventListener('load', async () => {
  const pendingScores = getOfflineScores();
  if (pendingScores.length > 0) {
    console.log(`Found ${pendingScores.length} pending score(s) to sync`);
    const result = await syncOfflineScores();
    if (result.synced > 0) {
      console.log(`Synced ${result.synced} score(s) on page load`);
    }
    updateSyncIndicator();
  }
});

// Listen for online event (when connection is restored)
window.addEventListener('online', async () => {
  console.log('Connection restored, syncing pending scores...');
  const result = await syncOfflineScores();
  if (result.synced > 0) {
    alert(`✅ Synced ${result.synced} pending score(s) to leaderboard!`);
  }
  updateSyncIndicator();
});

// Listen for offline event
window.addEventListener('offline', () => {
  console.log('Connection lost. Scores will be saved offline.');
});

// Update sync indicator
function updateSyncIndicator() {
  const pendingScores = getOfflineScores();
  const syncStatusElement = document.getElementById('syncStatus');
  const syncTextElement = document.getElementById('syncText');
  
  if (pendingScores.length > 0) {
    if (syncStatusElement) {
      syncStatusElement.style.display = 'flex';
      if (syncTextElement) {
        syncTextElement.textContent = `${pendingScores.length} score(s) pending sync`;
      }
    }
  } else {
    if (syncStatusElement) {
      syncStatusElement.style.display = 'none';
    }
  }
}

// Fetch mine positions for developer mode
async function fetchMinePositions() {
  if (!gameId) return;
  
  try {
    const response = await fetch(`${API_URL}/game/${gameId}/dev`);
    const data = await response.json();
    minePositions = data.board;
  } catch (error) {
    console.error('Error fetching mine positions:', error);
    minePositions = null;
  }
}

// Secret code listener - Supports both "SHOWMINES" and Konami Code
document.addEventListener('keydown', async (e) => {
  let codeMatched = false;
  
  // Track text code (SHOWMINES)
  if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
    keySequence += e.key.toLowerCase();
    
    // Keep only last length of secret code
    if (keySequence.length > SECRET_CODE.length) {
      keySequence = keySequence.slice(-SECRET_CODE.length);
    }
    
    // Check if text sequence matches
    if (keySequence === SECRET_CODE) {
      codeMatched = true;
      keySequence = ''; // Reset sequence
    }
  }
  
  // Track Konami code (arrow keys + b + a)
  arrowSequence.push(e.key);
  
  // Keep only last 10 keys for Konami code
  if (arrowSequence.length > KONAMI_CODE.length) {
    arrowSequence.shift();
  }
  
  // Check if Konami sequence matches
  if (arrowSequence.length === KONAMI_CODE.length) {
    const matches = arrowSequence.every((key, index) => key === KONAMI_CODE[index]);
    if (matches) {
      codeMatched = true;
      arrowSequence = []; // Reset sequence
    }
  }
  
  // If either code matched, toggle developer mode
  if (codeMatched) {
    developerMode = !developerMode;
    console.log(`🔓 Developer Mode: ${developerMode ? 'ON' : 'OFF'}`);
    
    if (developerMode) {
      await fetchMinePositions();
    } else {
      minePositions = null;
    }
    
    renderBoard(); // Re-render to show/hide mines
    
    // Show notification
    const message = developerMode ? '🔓 Developer Mode ACTIVATED' : '🔒 Developer Mode DEACTIVATED';
    showNotification(message);
  }
});

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'dev-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Start the game when page loads
startNewGame();

// Update sync indicator on initial load
setTimeout(() => {
  updateSyncIndicator();
}, 100);
