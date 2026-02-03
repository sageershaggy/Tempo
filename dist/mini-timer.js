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

// Pin/Always on top toggle
pinBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  isPinned = !isPinned;

  if (isPinned) {
    pinBtn.classList.add('pinned');
    pinBtn.title = 'Unpin (disable always on top)';
  } else {
    pinBtn.classList.remove('pinned');
    pinBtn.title = 'Always on top';
  }

  // Send message to background to toggle always on top
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        action: 'setAlwaysOnTop',
        alwaysOnTop: isPinned
      });
    }
  } catch (e) {
    console.log('Could not toggle always on top');
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
