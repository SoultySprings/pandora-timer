// ==============================
// Utilities
// ==============================
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const fmtTime = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

// local YYYY-MM-DD
const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

function parseYMD(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d); // local midnight
}

// ==============================
// LocalStorage
// ==============================
const LS_KEYS = {
  SETTINGS: 'pomodoro_settings_v2',
  STATS: 'pomodoro_stats_v2',
  HISTORY: 'pomodoro_history_v2',
  THEME: 'pomodoro_theme_v2'
};

const defaultSettings = {
  workMins: 25,
  shortMins: 5,
  longMins: 15,
  sessionsBeforeLong: 4,
  autoStartBreaks: true,
  autoStartWork: false,
  soundOn: true,
  notifyOn: false
};

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(LS_KEYS.SETTINGS)) || { ...defaultSettings }; }
  catch { return { ...defaultSettings }; }
}
function saveSettings(s) {
  localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(s));
}

function loadStats() {
  const base = { days: {}, sessionsCompleted: 0, streak: 0, lastActiveDay: null };
  try { return Object.assign(base, JSON.parse(localStorage.getItem(LS_KEYS.STATS)) || {}); }
  catch { return base; }
}
function saveStats(s) {
  localStorage.setItem(LS_KEYS.STATS, JSON.stringify(s));
}

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(LS_KEYS.HISTORY)) || []; }
  catch { return []; }
}
function saveHistory(h) {
  localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(h));
}

// ==============================
// Elements
// ==============================
const timeEl = $('#time');
const progressEl = $('#progress');
const startPauseBtn = $('#startPause');
const resetBtn = $('#reset');
const skipBtn = $('#skip');
const clearHistoryBtn = $('#clearHistory');

const modeChips = $$('.mode-chip');
const phaseText = $('#phaseText');
const cycleText = $('#cycleText');
const cycleCountEl = $('#cycleCount');

const todayFocusEl = $('#todayFocus');
const sessionsCompletedEl = $('#sessionsCompleted');
const streakDaysEl = $('#streakDays');

const workMinsEl = $('#workMins');
const shortMinsEl = $('#shortMins');
const longMinsEl = $('#longMins');
const sessionsBeforeLongEl = $('#sessionsBeforeLong');
const autoStartBreaksEl = $('#autoStartBreaks');
const autoStartWorkEl = $('#autoStartWork');
const soundOnEl = $('#soundOn');
const notifyOnEl = $('#notifyOn');

const settingsForm = $('#settingsForm');
const restoreDefaultsBtn = $('#restoreDefaults');

const historyList = $('#historyList');
const noHistoryNote = $('#noHistoryNote');

const themeToggle = $('#themeToggle');
const themeIcon = $('#themeIcon');
const exportBtn = $('#exportBtn');

// ==============================
// Theme
// ==============================
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem(LS_KEYS.THEME, t);
  themeIcon.innerHTML = (t === 'dark')
    ? '<path d="M21.64 13A9 9 0 1 1 11 2.36 7 7 0 1 0 21.64 13Z"/>'
    : '<path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0 4a1 1 0 0 1 1 1v1h-2v-1a1 1 0 0 1 1-1Zm0-20a1 1 0 0 1-1-1V0h2v1a1 1 0 0 1-1 1Zm10 9h2v2h-2v-2ZM0 11h2v2H0v-2Zm17.657 7.071 1.414 1.415-1.414 1.414-1.415-1.414 1.415-1.415ZM5.343 5.343 3.93 3.93l1.414-1.414 1.415 1.414L5.343 5.343Zm12.314-2.828 1.415 1.414-1.415 1.415-1.414-1.415 1.414-1.414ZM5.343 18.657l1.415 1.415-1.415 1.414L3.93 20.07l1.414-1.414Z"/>';
}
applyTheme(localStorage.getItem(LS_KEYS.THEME) || 'light');

themeToggle.addEventListener('click', () => {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});

// ==============================
// Timer State
// ==============================
let settings = loadSettings();
let stats = loadStats();
let history = loadHistory();

function fillSettingsUI() {
  workMinsEl.value = settings.workMins;
  shortMinsEl.value = settings.shortMins;
  longMinsEl.value = settings.longMins;
  sessionsBeforeLongEl.value = settings.sessionsBeforeLong;
  autoStartBreaksEl.checked = settings.autoStartBreaks;
  autoStartWorkEl.checked = settings.autoStartWork;
  soundOnEl.checked = settings.soundOn;
  notifyOnEl.checked = settings.notifyOn;
}
fillSettingsUI();

let mode = 'work';
let totalSeconds = settings.workMins * 60;
let remaining = totalSeconds;
let running = false;
let tickHandle = null;
let cycleCount = 1;
updateTimerUI();



// ==============================
// Navbar toggle
// ==============================
const toggleBtn = document.getElementById('sidebarToggle');
const navbar = document.querySelector('.navbar');

// Function to update toggle button visibility
function updateToggle() {
  if (window.innerWidth < 1500 && !navbar.classList.contains('show')) {
    toggleBtn.classList.add('active'); // show toggle
  } else {
    toggleBtn.classList.remove('active'); // hide toggle
  }
}

// Show sidebar
toggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  navbar.classList.add('show');
  toggleBtn.classList.remove('active'); // hide toggle while sidebar is open
});

// Click outside sidebar to close it
document.addEventListener('click', (e) => {
  if (navbar.classList.contains('show') && !navbar.contains(e.target) && e.target !== toggleBtn) {
    navbar.classList.remove('show');
    updateToggle(); // restore toggle button
  }
});

// Show/hide toggle button on resize
window.addEventListener('resize', () => {
  if (window.innerWidth >= 1500) {
    navbar.classList.remove('show');
    toggleBtn.classList.remove('active');
  } else {
    updateToggle();
  }
});

// Initial state
updateToggle();

// ==============================
// Charts
// ==============================
const trendCtx = document.getElementById('trendChart')?.getContext('2d');
const taskCtx = document.getElementById('taskChart')?.getContext('2d');
const sessionCtx = document.getElementById('sessionChart')?.getContext('2d');

let trendChart = null;
let taskChart = null;
let sessionChart = null;

// ----- Trend Chart (Line) -----
if (trendCtx) {
  trendChart = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Focus minutes',
        data: [],
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4f46e5',
        backgroundColor: 'transparent',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.2)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ----- Task Chart (Doughnut) -----
if (taskCtx) {
  taskChart = new Chart(taskCtx, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Pending'],
      datasets: [{
        data: [0, 0],
        backgroundColor: [
          getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4f46e5',
          getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#94a3b8'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

// ----- Session Chart (Bar) -----
if (sessionCtx) {
  sessionChart = new Chart(sessionCtx, {
    type: 'bar',
    data: {
      labels: ['Focus', 'Break'],
      datasets: [{
        label: 'Minutes',
        data: [0, 0],
        backgroundColor: [
          getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4f46e5',
          getComputedStyle(document.documentElement).getPropertyValue('--accent-2').trim() || '#f97316'
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.2)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ==============================
// Refresh Functions
// ==============================
function refreshTrendChart() {
  const labels = [];
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    labels.push(key.slice(5));
    data.push(Math.round((stats.days[key]?.focus || 0) / 60));
  }
  if (trendChart) {
    trendChart.data.labels = labels;
    trendChart.data.datasets[0].data = data;
    trendChart.update();
  }
}

function refreshTaskChart(completed, pending) {
  if (taskChart) {
    taskChart.data.datasets[0].data = [completed, pending];
    taskChart.update();
  }
}

function refreshSessionChart(focusMinutes, breakMinutes) {
  if (sessionChart) {
    sessionChart.data.datasets[0].data = [focusMinutes, breakMinutes];
    sessionChart.update();
  }
}

// ==============================
// Stats / History UI
// ==============================
function updateStatsUI() {
  const today = todayKey();
  const todaySecs = stats.days[today]?.focus || 0;
  todayFocusEl.textContent = `${Math.round(todaySecs / 60)}m`;
  sessionsCompletedEl.textContent = stats.sessionsCompleted || 0;
  streakDaysEl.textContent = stats.streak || 0;

  // Update trend chart
  refreshTrendChart();

  // --- Update task chart ---
  const completed = stats.sessionsCompleted || 0;
  // e.g., pending = total planned - completed; 
  // if you don't have planned tasks, you can just show "completed vs 0 pending"
  const pending = Math.max((stats.plannedTasks || 0) - completed, 0);
  refreshTaskChart(completed, pending);

  // --- Update session chart ---
  let focusMins = 0, breakMins = 0;
  if (stats.days[today]) {
    focusMins = Math.round((stats.days[today].focus || 0) / 60);
    breakMins = Math.round((stats.days[today].breaks || 0) / 60);
  }
  refreshSessionChart(focusMins, breakMins);
}


function renderHistory() {
  historyList.innerHTML = '';
  if (!history.length) {
    noHistoryNote.style.display = 'block';
    return;
  }
  noHistoryNote.style.display = 'none';
  const last = history.slice(-12).reverse();
  last.forEach(h => {
    const li = document.createElement('li');
    const pillClass = h.mode === 'work' ? 'work' : (h.mode === 'short' ? 'short' : 'long');
    li.innerHTML = `
          <div>
            <span class="pill ${pillClass}">${h.mode}</span>
            <span class="muted"> • ${new Date(h.ts).toLocaleString()}</span>
          </div>
          <div>${h.duration / 60}m</div>
          <div class="${h.mode === 'work' ? 'success' : 'muted'}">${h.note || ''}</div>
        `;
    historyList.appendChild(li);
  });
}

function recordSession(durationSecs, note = '') {
  history.push({ ts: Date.now(), mode, duration: durationSecs, note });
  saveHistory(history);
  renderHistory();
}

// streak calculation
function updateStreak() {
  const today = todayKey();
  const last = stats.lastActiveDay;
  const todayHasFocus = (stats.days[today]?.focus || 0) > 0;

  if (!last) {
    stats.streak = todayHasFocus ? 1 : 0;
  } else {
    const lastDate = parseYMD(last);
    const todayDate = parseYMD(today);
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const diffDays = Math.floor((todayDate - lastDate) / MS_PER_DAY);

    if (diffDays === 0) {
      // same day -> no change
    } else if (diffDays === 1 && todayHasFocus) {
      stats.streak = (stats.streak || 0) + 1;
    } else {
      stats.streak = todayHasFocus ? 1 : 0;
    }
  }

  if (todayHasFocus) stats.lastActiveDay = today;
  saveStats(stats);
}

// ==============================
// Timer Logic
// ==============================
function setMode(m) {
  mode = m;
  modeChips.forEach(c => c.classList.toggle('active', c.dataset.mode === m));
  const mins = (m === 'work') ? settings.workMins : (m === 'short' ? settings.shortMins : settings.longMins);
  totalSeconds = mins * 60;
  remaining = totalSeconds;
  phaseText.textContent = (m === 'work') ? 'Focus session' : (m === 'short' ? 'Short break' : 'Long break');
  updateTimerUI();
}

function start() {
  if (running) return;
  running = true;
  startPauseBtn.textContent = 'Pause';
  tickHandle = setInterval(tick, 1000);
}
function pause() {
  running = false;
  startPauseBtn.textContent = 'Start';
  clearInterval(tickHandle);
  tickHandle = null;
}
function resetTimer() {
  pause();
  remaining = totalSeconds;
  updateTimerUI();
}

function tick() {
  if (remaining <= 0) {
    completeSession();
    return;
  }
  remaining -= 1;
  updateTimerUI();
}

function completeSession() {
  pause();
  beep();
  notify(`${mode === 'work' ? 'Focus' : 'Break'} finished`);
  const spent = totalSeconds;
  const key = todayKey();
  stats.days[key] = stats.days[key] || { focus: 0, breaks: 0 };
  if (mode === 'work') {
    stats.days[key].focus += spent;
    stats.sessionsCompleted = (stats.sessionsCompleted || 0) + 1;
  } else {
    stats.days[key].breaks += spent;
  }
  saveStats(stats);
  updateStatsUI();
  updateStreak();
  recordSession(spent, mode === 'work' ? '✓ Done' : '—');

  if (mode === 'work') {
    if (cycleCount % settings.sessionsBeforeLong === 0) {
      setMode('long');
    } else {
      setMode('short');
    }
    if (settings.autoStartBreaks) start();
  } else {
    cycleCount += 1;
    cycleCountEl.textContent = cycleCount;
    setMode('work');
    if (settings.autoStartWork) start();
  }
}

function updateTimerUI() {
  timeEl.textContent = fmtTime(remaining);
  progressEl.style.width = `${100 * (1 - remaining / totalSeconds)}%`;
  cycleCountEl.textContent = cycleCount;
}

// ==============================
// Sound & Notifications
// ==============================
function beep() {
  if (!settings.soundOn) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = 880;
  o.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(0.001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
  o.start(); o.stop(ctx.currentTime + 0.26);
}

function notify(msg) {
  if (!settings.notifyOn) return;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification('Study Pomodoro', { body: msg });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => { if (p === 'granted') new Notification('Study Pomodoro', { body: msg }); });
  }
}

// ==============================
// Events
// ==============================
startPauseBtn.addEventListener('click', () => running ? pause() : start());
resetBtn.addEventListener('click', resetTimer);
skipBtn.addEventListener('click', completeSession);
clearHistoryBtn.addEventListener('click', () => {
  if (!history.length) return;
  if (confirm('Clear all history? This cannot be undone.')) {
    history = [];
    saveHistory(history);
    renderHistory();
  }
});

modeChips.forEach(b => b.addEventListener('click', () => {
  pause();
  setMode(b.dataset.mode);
}));

settingsForm.addEventListener('submit', (e) => {
  e.preventDefault();
  settings = {
    workMins: parseInt(workMinsEl.value) || 25,
    shortMins: parseInt(shortMinsEl.value) || 5,
    longMins: parseInt(longMinsEl.value) || 15,
    sessionsBeforeLong: Math.max(2, Math.min(12, parseInt(sessionsBeforeLongEl.value) || 4)),
    autoStartBreaks: !!autoStartBreaksEl.checked,
    autoStartWork: !!autoStartWorkEl.checked,
    soundOn: !!soundOnEl.checked,
    notifyOn: !!notifyOnEl.checked
  };
  saveSettings(settings);
  const wasMode = mode;
  setMode(wasMode);
  alert('Settings saved.');
});

restoreDefaultsBtn.addEventListener('click', () => {
  if (!confirm('Restore default settings?')) return;
  settings = { ...defaultSettings };
  saveSettings(settings);
  fillSettingsUI();
  setMode('work');
  cycleCount = 1; updateTimerUI();
});

document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  if (e.code === 'Space') { e.preventDefault(); running ? pause() : start(); }
  if (e.key.toLowerCase() === 'r') resetTimer();
  if (e.key.toLowerCase() === 'n') completeSession();
  if (e.key.toLowerCase() === 't') themeToggle.click();
});

exportBtn.addEventListener('click', () => {
  const rows = [['date', 'focus_seconds', 'break_seconds', 'sessions_completed_total', 'streak']];
  const dates = Object.keys(stats.days).sort();
  dates.forEach(d => {
    rows.push([d, stats.days[d].focus || 0, stats.days[d].breaks || 0, stats.sessionsCompleted || 0, stats.streak || 0]);
  });
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'study_pomodoro_stats.csv';
  a.click();
  URL.revokeObjectURL(a.href);
});

//     // ==== API BASE URL ====
// const API_BASE = "http://localhost:8080/api/auth"; 
// // Example: Spring Boot backend endpoint

// // ==== LOGIN ====
// document.getElementById("loginBtn").addEventListener("click", async () => {
//   const username = prompt("Enter username:");
//   const password = prompt("Enter password:");

//   if (!username || !password) return;

//   try {
//     const response = await fetch(`${API_BASE}/login`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ username, password })
//     });

//     if (response.ok) {
//       const data = await response.json();
//       alert("Login successful!");
//       localStorage.setItem("token", data.token); // Save JWT
//     } else {
//       alert("Login failed. Check credentials.");
//     }
//   } catch (err) {
//     console.error("Login error:", err);
//     alert("Server error during login.");
//   }
// });

// // ==== SIGNUP ====
// document.getElementById("signupBtn").addEventListener("click", async () => {
//   const username = prompt("Choose a username:");
//   const password = prompt("Choose a password:");

//   if (!username || !password) return;

//   try {
//     const response = await fetch(`${API_BASE}/signup`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ username, password })
//     });

//     if (response.ok) {
//       alert("Signup successful! Please login now.");
//     } else {
//       alert("Signup failed. Try another username.");
//     }
//   } catch (err) {
//     console.error("Signup error:", err);
//     alert("Server error during signup.");
//   }
// });


// Palette Switcher
const paletteSelect = document.getElementById("paletteSelect");

if (paletteSelect) {
  // Load saved palette
  const savedPalette = localStorage.getItem("palette") || "default";
  if (savedPalette !== "default") {
    document.documentElement.classList.add(`palette-${savedPalette}`);
    paletteSelect.value = savedPalette;
  }

  paletteSelect.addEventListener("change", (e) => {
    const root = document.documentElement;

    // Remove any existing palette classes dynamically
    root.classList.forEach(cls => {
      if (cls.startsWith("palette-")) {
        root.classList.remove(cls);
      }
    });

    const chosen = e.target.value;
    if (chosen !== "default") {
      root.classList.add(`palette-${chosen}`);
    }

    // Persist choice
    localStorage.setItem("palette", chosen);
  });
}



// ==============================
// Initial paint
// ==============================
function initFromStorage() {
  const today = todayKey();
  if (stats.days[today]?.focus) stats.lastActiveDay = today;
  saveStats(stats);

  setMode('work');
  updateStatsUI();
  renderHistory();
}
initFromStorage();

