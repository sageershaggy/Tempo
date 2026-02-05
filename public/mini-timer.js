// Mini Timer Script - Syncs with main Tempo timer
// Reads from localStorage (tempo_timer_target, tempo_timer_active) which is the source of truth

const container = document.getElementById('container');
const timerEl = document.getElementById('timer');
const pulseDot = document.getElementById('pulseDot');
const closeBtn = document.getElementById('closeBtn');
const pinBtn = document.getElementById('pinBtn');

// Storage keys matching main app constants
const STORAGE_KEYS = {
  TIMER_TARGET: 'tempo_timer_target',
  TIMER_ACTIVE: 'tempo_timer_active',
  TIMER_MODE: 'tempo_timer_mode'
};

let isPinned = false;
let pinInterval = null;
let currentWindowId = null;

// Get current window ID on load
if (typeof chrome !== 'undefined' && chrome.windows) {
  chrome.windows.getCurrent((win) => {
    currentWindowId = win.id;
  });
}

function formatTime(seconds) {
  if (seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTheme() {
  const timerMode = localStorage.getItem(STORAGE_KEYS.TIMER_MODE) || 'focus';

  if (timerMode === 'break') {
    pulseDot.classList.add('break-mode');
    document.documentElement.style.setProperty('--theme-color', '#22C55E');
  } else {
    pulseDot.classList.remove('break-mode');
    document.documentElement.style.setProperty('--theme-color', '#7F13EC');
  }
}

function updateTimer() {
  // Update theme based on mode
  updateTheme();

  // Primary: read from localStorage (same as main app)
  const savedTarget = localStorage.getItem(STORAGE_KEYS.TIMER_TARGET);
  const savedActive = localStorage.getItem(STORAGE_KEYS.TIMER_ACTIVE) === 'true';

  if (savedActive && savedTarget) {
    const targetTime = parseInt(savedTarget, 10);
    const now = Date.now();
    const diff = Math.ceil((targetTime - now) / 1000);

    if (diff > 0) {
      timerEl.textContent = formatTime(diff);
      timerEl.classList.add('active');
      timerEl.classList.remove('paused');
      pulseDot.classList.remove('paused');
      container.classList.remove('no-timer');
    } else {
      // Timer expired
      timerEl.textContent = '00:00';
      timerEl.classList.remove('active');
      timerEl.classList.add('paused');
      pulseDot.classList.add('paused');
    }
  } else if (savedTarget) {
    // Timer paused but has remaining time
    const targetTime = parseInt(savedTarget, 10);
    const now = Date.now();
    const diff = Math.ceil((targetTime - now) / 1000);

    pulseDot.classList.add('paused');
    timerEl.classList.remove('active');
    timerEl.classList.add('paused');

    if (diff > 0) {
      timerEl.textContent = formatTime(diff);
    } else {
      timerEl.textContent = 'Ready';
      container.classList.add('no-timer');
    }
  } else {
    // No timer set
    pulseDot.classList.add('paused');
    timerEl.classList.remove('active');
    timerEl.classList.add('paused');
    timerEl.textContent = 'Ready';
    container.classList.add('no-timer');
  }
}

// Close window
closeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  window.close();
});

// Pin/Always on top toggle - keeps window focused when pinned
pinBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  isPinned = !isPinned;

  if (isPinned) {
    pinBtn.classList.add('pinned');
    pinBtn.title = 'Unpin (stop keeping on top)';

    // Start interval to keep window focused/on top
    // This checks every 500ms if another window took focus and brings this back
    if (pinInterval) clearInterval(pinInterval);
    pinInterval = setInterval(() => {
      if (isPinned && currentWindowId && typeof chrome !== 'undefined' && chrome.windows) {
        // Get current focused window
        chrome.windows.getLastFocused((focusedWin) => {
          // If a different window is focused, bring mini timer back to front
          if (focusedWin.id !== currentWindowId) {
            chrome.windows.update(currentWindowId, { focused: true });
          }
        });
      }
    }, 500);

    // Immediately focus
    if (currentWindowId && typeof chrome !== 'undefined' && chrome.windows) {
      chrome.windows.update(currentWindowId, { focused: true });
    }
  } else {
    pinBtn.classList.remove('pinned');
    pinBtn.title = 'Keep on top';

    // Stop the focus interval
    if (pinInterval) {
      clearInterval(pinInterval);
      pinInterval = null;
    }
  }
});

// Click on timer to open main app
container.addEventListener('dblclick', () => {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      window.open(chrome.runtime.getURL('index.html'));
    }
  } catch (e) {
    console.log('Could not open main app');
  }
});

// Update every 500ms for smooth countdown
updateTimer();
setInterval(updateTimer, 500);

// Listen for localStorage changes from other windows/tabs
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEYS.TIMER_TARGET || e.key === STORAGE_KEYS.TIMER_ACTIVE || e.key === STORAGE_KEYS.TIMER_MODE) {
    updateTimer();
  }
});
