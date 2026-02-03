// Mini Timer Script - Syncs with main Tempo timer

const container = document.getElementById('container');
const timerEl = document.getElementById('timer');
const pulseDot = document.getElementById('pulseDot');
const closeBtn = document.getElementById('closeBtn');

function formatTime(seconds) {
  if (seconds <= 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTimer() {
  // Try chrome.storage.local first (for extension context)
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['timerTargetTime'], (data) => {
      if (chrome.runtime.lastError) {
        checkLocalStorage();
        return;
      }

      if (data.timerTargetTime) {
        const now = Date.now();
        const diff = Math.ceil((data.timerTargetTime - now) / 1000);

        if (diff > 0) {
          timerEl.textContent = formatTime(diff);
          timerEl.classList.add('active');
          timerEl.classList.remove('paused');
          pulseDot.classList.remove('paused');
          container.classList.remove('no-timer');
        } else {
          timerEl.textContent = '00:00';
          timerEl.classList.remove('active');
          timerEl.classList.add('paused');
          pulseDot.classList.add('paused');
        }
      } else {
        // No timer running - try localStorage fallback
        checkLocalStorage();
      }
    });
  } else {
    // Fallback to localStorage
    checkLocalStorage();
  }
}

function checkLocalStorage() {
  const savedTarget = localStorage.getItem('tempo_timer_target');
  const savedActive = localStorage.getItem('tempo_timer_active') === 'true';

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
      timerEl.textContent = '00:00';
      timerEl.classList.remove('active');
      timerEl.classList.add('paused');
      pulseDot.classList.add('paused');
    }
  } else {
    // Paused or no timer
    pulseDot.classList.add('paused');
    timerEl.classList.remove('active');
    timerEl.classList.add('paused');

    if (savedTarget) {
      const targetTime = parseInt(savedTarget, 10);
      const now = Date.now();
      const diff = Math.ceil((targetTime - now) / 1000);
      if (diff > 0) {
        timerEl.textContent = formatTime(diff);
      } else {
        timerEl.textContent = 'Ready';
        container.classList.add('no-timer');
      }
    } else {
      timerEl.textContent = 'Ready';
      container.classList.add('no-timer');
    }
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

// Update every 500ms
updateTimer();
setInterval(updateTimer, 500);

// Listen for chrome.storage changes
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.timerTargetTime) {
      updateTimer();
    }
  });
}

// Also listen for localStorage changes (fallback)
window.addEventListener('storage', (e) => {
  if (e.key === 'tempo_timer_target' || e.key === 'tempo_timer_active') {
    updateTimer();
  }
});
