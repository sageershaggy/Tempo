// Mini Timer Script - Syncs with main Tempo timer
// Reads from localStorage (tempo_timer_target, tempo_timer_active) which is the source of truth

const container = document.getElementById('container');
const timerEl = document.getElementById('timer');
const pulseDot = document.getElementById('pulseDot');
const closeBtn = document.getElementById('closeBtn');

// Storage keys matching main app constants
const STORAGE_KEYS = {
  TIMER_TARGET: 'tempo_timer_target',
  TIMER_ACTIVE: 'tempo_timer_active'
};

function formatTime(seconds) {
  if (seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTimer() {
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
  if (e.key === STORAGE_KEYS.TIMER_TARGET || e.key === STORAGE_KEYS.TIMER_ACTIVE) {
    updateTimer();
  }
});
