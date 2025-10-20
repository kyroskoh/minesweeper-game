//const API_URL = 'http://localhost:3030/api';
// In the frontend/browser:
const API_URL = 'https://mine.kyros.party/api';

let gameId = null;
let gameState = null;
let flagsPlaced = 0;
let timerInterval = null;
let localStartTime = null;

const boardElement = document.getElementById('board');
const minesCountElement = document.getElementById('minesCount');
const flagsCountElement = document.getElementById('flagsCount');
const gameStatusElement = document.getElementById('gameStatus');
const timerElement = document.getElementById('timer');
const newGameBtn = document.getElementById('newGame');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const leaderboardModal = document.getElementById('leaderboardModal');
const closeModal = document.querySelector('.close');

const difficulties = {
  easy: { rows: 8, cols: 8, mines: 10, name: 'Easy' },
  medium: { rows: 10, cols: 10, mines: 15, name: 'Medium' },
  hard: { rows: 15, cols: 15, mines: 35, name: 'Hard' },
  expert: { rows: 18, cols: 18, mines: 60, name: 'Expert' },
  extreme: { rows: 20, cols: 20, mines: 80, name: 'Extreme' }
};

let currentDifficulty = 'medium';

// Initialize game
async function startNewGame() {
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

// Render the game board
function renderBoard() {
  if (!gameState) return;
  
  boardElement.innerHTML = '';
  boardElement.style.gridTemplateColumns = `repeat(${gameState.cols}, 30px)`;
  boardElement.style.gridTemplateRows = `repeat(${gameState.rows}, 30px)`;
  
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
    
    setTimeout(async () => {
      const playerName = prompt(`🎉 Congratulations! You won in ${formatTime(time)}!\n\nEnter your name for the leaderboard:`);
      
      if (playerName && playerName.trim()) {
        await submitScore(playerName.trim(), time, difficulty);
        alert('Score saved to leaderboard!');
      }
      
      if (confirm('Start a new game?')) {
        startNewGame();
      }
    }, 500);
  } else {
    setTimeout(() => {
      if (confirm('Game Over! You hit a mine 💥\n\nStart a new game?')) {
        startNewGame();
      }
    }, 500);
  }
}

// Submit score to leaderboard
async function submitScore(name, time, difficulty) {
  try {
    await fetch(`${API_URL}/leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, time, difficulty })
    });
  } catch (error) {
    console.error('Error submitting score:', error);
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

// Leaderboard functions
let currentLeaderboardTab = 'Easy';

async function loadLeaderboard(difficulty) {
  try {
    const response = await fetch(`${API_URL}/leaderboard`);
    const data = await response.json();
    displayLeaderboard(data.leaderboard[difficulty]);
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    displayLeaderboard([]);
  }
}

function displayLeaderboard(scores) {
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

// Start the game when page loads
startNewGame();
