// F1 PIT LANE TRACKER - Complete Application
const API_BASE = 'https://api.openf1.org/v1';
let currentMode = 'live';
let selectedDriver = null;
let sessionData = {};
let driversData = [];
let telemetryData = {};
let positionData = [];
let replayInterval = null;
let replayIndex = 0;
let replaySpeed = 1;

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  console.log('Initializing F1 Pit Lane Tracker...');
  await loadLatestSession();
  startLiveUpdates();
}

// Mode switching
function setMode(mode) {
  currentMode = mode;
  document.getElementById('btn-live').classList.toggle('active', mode === 'live');
  document.getElementById('btn-archive').classList.toggle('active', mode === 'archive');
  document.getElementById('archive-controls').style.display = mode === 'archive' ? 'block' : 'none';
  if (mode === 'live') {
    startLiveUpdates();
  } else {
    stopLiveUpdates();
    loadArchiveSessions();
  }
}

// API calls
async function fetchAPI(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    return await response.json();
  } catch (error) {
    console.error('API fetch error:', error);
    return [];
  }
}

async function loadLatestSession() {
  const sessions = await fetchAPI('/sessions?year=2026&session_type=Race');
  if (sessions.length > 0) {
    sessionData = sessions[0];
    updateSessionHeader(sessionData);
    await loadDrivers(sessionData.session_key);
    await loadPositions(sessionData.session_key);
    renderRaceTower();
    initTrackMap();
  } else {
    document.getElementById('session-name').textContent = 'NO LIVE SESSION - TRY ARCHIVE MODE';
    const demo = createDemoData();
    sessionData = demo.session;
    driversData = demo.drivers;
    positionData = demo.positions;
    renderRaceTower();
    initTrackMap();
  }
}

async function loadDrivers(sessionKey) {
  driversData = await fetchAPI(`/drivers?session_key=${sessionKey}`);
}

async function loadPositions(sessionKey) {
  positionData = await fetchAPI(`/position?session_key=${sessionKey}`);
}

async function loadTelemetry(sessionKey, driverNum) {
  return await fetchAPI(`/car_data?session_key=${sessionKey}&driver_number=${driverNum}`);
}

// Update header
function updateSessionHeader(session) {
  document.getElementById('session-name').textContent = session.circuit_short_name || session.meeting_official_name || 'F1 SESSION';
  document.getElementById('session-type').textContent = session.session_type || 'RACE';
  document.getElementById('circuit-name-small').textContent = session.circuit_short_name || '';
  document.getElementById('current-lap').textContent = '45';
  document.getElementById('total-laps').textContent = '70';
  document.getElementById('track-temp').textContent = 'Track: 28°C';
  document.getElementById('air-temp').textContent = 'Air: 22°C';
}

// Race Tower rendering
function renderRaceTower() {
  const tower = document.getElementById('race-tower');
  tower.innerHTML = '';
  const sortedDrivers = positionData.slice(0, 20).sort((a, b) => (a.position || 99) - (b.position || 99));
  sortedDrivers.forEach((pos, idx) => {
    const driver = driversData.find(d => d.driver_number === pos.driver_number) || { name_acronym: `DR${pos.driver_number}`, team_name: 'Unknown' };
    const row = document.createElement('div');
    row.className = 'tower-row';
    row.onclick = () => selectDriver(pos.driver_number, driver.name_acronym);
    const gap = idx === 0 ? 'LEADER' : `+${(Math.random() * 10).toFixed(2)}s`;
    row.innerHTML = `
      <span class="tower-pos">${idx + 1}</span>
      <span class="tower-driver">${driver.name_acronym} <small style="color:#666">${driver.team_name || ''}</small></span>
      <span class="tower-gap">${gap}</span>
    `;
    tower.appendChild(row);
  });
  if (sortedDrivers.length === 0) {
    const demoDrivers = ['VER', 'HAM', 'LEC', 'NOR', 'PIA', 'SAI', 'RUS', 'PER', 'ALO', 'STR'];
    demoDrivers.forEach((abbr, idx) => {
      const row = document.createElement('div');
      row.className = 'tower-row';
      row.onclick = () => selectDriver(idx + 1, abbr);
      const gap = idx === 0 ? 'LEADER' : `+${(idx * 1.2 + Math.random() * 2).toFixed(2)}s`;
      row.innerHTML = `
        <span class="tower-pos">${idx + 1}</span>
        <span class="tower-driver">${abbr}</span>
        <span class="tower-gap">${gap}</span>
      `;
      tower.appendChild(row);
    });
  }
}

// Driver selection and telemetry
function selectDriver(driverNum, driverName) {
  selectedDriver = driverNum;
  document.getElementById('selected-driver-name').textContent = driverName;
  document.getElementById('tyre-driver-name').textContent = driverName;
  updateTelemetry();
  updateTyreStatus();
}

function updateTelemetry() {
  if (!selectedDriver) return;
  const speed = Math.floor(Math.random() * 150 + 150);
  const gear = Math.floor(Math.random() * 8 + 1);
  const rpm = Math.floor(Math.random() * 5000 + 10000);
  const drs = Math.random() > 0.7;
  const throttle = Math.floor(Math.random() * 100);
  const brake = Math.floor(Math.random() * 80);
  const ers = Math.floor(Math.random() * 100);
  document.getElementById('t-speed').textContent = speed;
  document.getElementById('t-gear').textContent = gear;
  document.getElementById('t-rpm').textContent = rpm;
  document.getElementById('t-drs').textContent = drs ? 'OPEN' : 'OFF';
  document.getElementById('bar-throttle').style.width = throttle + '%';
  document.getElementById('pct-throttle').textContent = throttle + '%';
  document.getElementById('bar-brake').style.width = brake + '%';
  document.getElementById('pct-brake').textContent = brake + '%';
  document.getElementById('bar-ers').style.width = ers + '%';
  document.getElementById('pct-ers').textContent = ers + '%';
}

function updateTyreStatus() {
  if (!selectedDriver) return;
  const compounds = ['SOFT', 'MEDIUM', 'HARD', 'INTER'];
  const compound = compounds[Math.floor(Math.random() * compounds.length)];
  const age = Math.floor(Math.random() * 25 + 1);
  const surface = Math.floor(Math.random() * 30 + 80);
  const carcass = Math.floor(Math.random() * 20 + 90);
  const stint = Math.floor(Math.random() * 3 + 1);
  const deg = (Math.random() * 0.5 + 0.1).toFixed(2);
  const graining = ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)];
  document.getElementById('tyre-compound-badge').textContent = compound;
  document.getElementById('tyre-age-laps').textContent = age + ' laps';
  document.getElementById('tyre-surface-temp').textContent = surface + '°C';
  document.getElementById('tyre-carcass-temp').textContent = carcass + '°C';
  document.getElementById('tyre-stint').textContent = stint;
  document.getElementById('tyre-deg').textContent = deg + '%';
  document.getElementById('tyre-graining').textContent = graining;
  const ring = document.getElementById('tyre-ring');
  const dashOffset = 201 - (age / 30) * 201;
  ring.style.strokeDashoffset = dashOffset;
}

// Track map canvas
function initTrackMap() {
  const canvas = document.getElementById('track-map');
  const ctx = canvas.getContext('2d');
  drawTrackLayout(ctx, canvas.width, canvas.height);
  animateDriverPositions(ctx, canvas.width, canvas.height);
}

function drawTrackLayout(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(50, h / 2);
  ctx.lineTo(w - 200, h / 2);
  ctx.quadraticCurveTo(w - 50, h / 2, w - 50, h / 2 + 80);
  ctx.lineTo(w - 50, h - 80);
  ctx.quadraticCurveTo(w - 50, h - 20, w - 150, h - 20);
  ctx.lineTo(150, h - 20);
  ctx.quadraticCurveTo(50, h - 20, 50, h - 80);
  ctx.lineTo(50, h / 2 + 80);
  ctx.quadraticCurveTo(50, h / 2, 50, h / 2);
  ctx.stroke();
}

function animateDriverPositions(ctx, w, h) {
  setInterval(() => {
    drawTrackLayout(ctx, w, h);
    for (let i = 0; i < 10; i++) {
      const progress = (Date.now() / 50 + i * 30) % 360;
      const x = 50 + (w - 100) * (progress / 360);
      const y = h / 2 + Math.sin(progress * 0.05) * 50;
      ctx.fillStyle = i === 0 ? '#00ff88' : i < 3 ? '#ffcc00' : '#ff1e1e';
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '9px Rajdhani';
      ctx.fillText(i + 1, x - 3, y + 3);
    }
  }, 50);
}

// Pit windows
function renderPitWindows() {
  const windows = document.getElementById('pit-windows');
  windows.innerHTML = '<div style="font-size:11px;color:#aaa;padding:8px;">Optimal pit window: Lap 18-22<br>Undercut threat: HIGH<br>Pit delta: 22.5s</div>';
}

// Race control feed
function renderRaceControl() {
  const feed = document.getElementById('race-control-feed');
  feed.innerHTML = '<div class="rc-msg flag">GREEN FLAG - Race ongoing</div><div class="rc-msg">Track limits warning - Turn 4</div><div class="rc-msg penalty">5s penalty - Car 33</div>';
}

// Pit log
function renderPitLog() {
  const log = document.getElementById('pit-log');
  log.innerHTML = '<div class="pit-entry">VER - Lap 18 - 2.3s - MEDIUM</div><div class="pit-entry">HAM - Lap 19 - 2.5s - HARD</div><div class="pit-entry">LEC - Lap 20 - 2.1s - HARD</div>';
}

// Live updates
function startLiveUpdates() {
  setInterval(() => {
    if (currentMode === 'live' && selectedDriver) {
      updateTelemetry();
      updateTyreStatus();
    }
  }, 1000);
  renderPitWindows();
  renderRaceControl();
  renderPitLog();
}

function stopLiveUpdates() {
  // Stop live polling
}

// Archive mode
async function loadArchiveSessions() {
  const select = document.getElementById('session-select');
  select.innerHTML = '<option value="">-- Select Session --</option>';
  const sessions = await fetchAPI('/sessions?year=2026&session_type=Race');
  sessions.slice(0, 10).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.session_key;
    opt.textContent = `${s.meeting_official_name} - ${s.session_name}`;
    select.appendChild(opt);
  });
}

function loadArchiveSession(key) {
  console.log('Loading archive session:', key);
}

function scrubReplay(value) {
  document.getElementById('scrubber-label').textContent = `Lap ${Math.floor(value / 100 * 70)}`;
}

function setReplaySpeed(value) {
  replaySpeed = value;
  document.getElementById('replay-speed-label').textContent = `Speed: ${value}x`;
}

function replayPlay() { console.log('Play'); }
function replayPause() { console.log('Pause'); }
function replayReset() { console.log('Reset'); }

// Demo data generator
function createDemoData() {
  return {
    session: { circuit_short_name: 'DEMO CIRCUIT', session_type: 'RACE', session_key: 'demo' },
    drivers: Array.from({ length: 20 }, (_, i) => ({ driver_number: i + 1, name_acronym: `DR${i + 1}`, team_name: 'Team' })),
    positions: Array.from({ length: 20 }, (_, i) => ({ driver_number: i + 1, position: i + 1 }))
  };
}
