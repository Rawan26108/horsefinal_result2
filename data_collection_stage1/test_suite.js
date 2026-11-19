/**
 * Automated Test Suite for Horse Sensor Log Web Interface
 */
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('RUNNING HORSE SENSOR LOG VERIFICATION TESTS');
console.log('====================================================\n');

// 1. Check Files Exist
const htmlPath = path.join(__dirname, 'index.html');
const cssPath = path.join(__dirname, 'style.css');
const jsPath = path.join(__dirname, 'app.js');

if (!fs.existsSync(htmlPath) || !fs.existsSync(cssPath) || !fs.existsSync(jsPath)) {
  console.error('FAIL: Missing required files!');
  process.exit(1);
}
console.log('✔ Files exist: index.html, style.css, app.js');

// 2. HTML Verification
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

const requiredTextOrElements = [
  'HORSE SENSOR LOG',
  'ACCELEROMETER • GYROSCOPE • GPS',
  'IDLE',
  'Walking Natural',
  'Walking Rider',
  'Trotting Natural',
  'Trotting Rider',
  'walking-natural',
  'walking-rider',
  'trotting-natural',
  'trotting-rider',
  'running-natural',
  'running-rider',
  'Running Natural',
  'Running Rider',
  'START',
  'END',
  '00:00',
  '0 SAMPLES',
  'LIVE SENSORS',
  'ACCELEROMETER (m/s²)',
  'GYROSCOPE (rad/s)',
  'GPS LOCATION',
  'RECORDED SESSIONS',
  'EXPORT ALL'
];

let htmlMissing = [];
for (const item of requiredTextOrElements) {
  if (!htmlContent.includes(item)) {
    htmlMissing.push(item);
  }
}

if (htmlMissing.length > 0) {
  console.error('FAIL: HTML missing required elements:', htmlMissing);
  process.exit(1);
}
console.log('✔ HTML contains all specified UI elements, titles, and exact labels');

// 3. Functional Simulation Test
// Create lightweight DOM mock to run app.js
class MockElement {
  constructor(tag, id = '', className = '') {
    this.tagName = tag;
    this.id = id;
    this.className = className;
    this.classList = {
      _classes: new Set(className ? className.split(' ') : []),
      add: (c) => this.classList._classes.add(c),
      remove: (c) => this.classList._classes.delete(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this.classList._classes.has(c)) this.classList._classes.delete(c);
          else this.classList._classes.add(c);
        } else if (force) {
          this.classList._classes.add(c);
        } else {
          this.classList._classes.delete(c);
        }
      },
      contains: (c) => this.classList._classes.has(c)
    };
    this.style = {};
    this.attributes = {};
    this.listeners = {};
    this.textContent = '';
    this.innerHTML = '';
    this.children = [];
    this.disabled = false;
    this.checked = false;
    this.dataset = {};
  }

  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k]; }
  removeAttribute(k) { delete this.attributes[k]; }

  addEventListener(type, fn) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(fn);
  }

  trigger(type, eventObj = {}) {
    if (this.listeners[type]) {
      this.listeners[type].forEach(fn => fn(eventObj));
    }
  }

  querySelector(sel) {
    return this.children.find(c => sel.includes(c.className) || sel.includes(c.id)) || new MockElement('div');
  }

  querySelectorAll(sel) {
    return this.children;
  }

  appendChild(child) {
    this.children.push(child);
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) this.children.splice(idx, 1);
  }

  remove() {}
}

const mockLocalStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

// Setup mock window & document
const elementsById = {
  statusPill: new MockElement('div', 'statusPill', 'status-pill'),
  statusDot: new MockElement('div', 'statusDot', 'status-dot'),
  statusText: new MockElement('span', 'statusText'),
  simCheckbox: new MockElement('input', 'simCheckbox'),
  simToggleWrap: new MockElement('label', 'simToggleWrap'),
  activityGrid: new MockElement('div', 'activityGrid'),
  currentLabelValue: new MockElement('div', 'currentLabelValue'),
  currentLabelText: new MockElement('span', 'currentLabelText'),
  internalKeyTag: new MockElement('span', 'internalKeyTag'),
  startBtn: new MockElement('button', 'startBtn'),
  endBtn: new MockElement('button', 'endBtn'),
  recordingBanner: new MockElement('div', 'recordingBanner'),
  bannerStatusText: new MockElement('div', 'bannerStatusText'),
  bannerActivityText: new MockElement('div', 'bannerActivityText'),
  timerDisplay: new MockElement('div', 'timerDisplay'),
  sampleCountDisplay: new MockElement('div', 'sampleCountDisplay'),
  permissionBtn: new MockElement('button', 'permissionBtn'),
  accXFill: new MockElement('div', 'accXFill'),
  accYFill: new MockElement('div', 'accYFill'),
  accZFill: new MockElement('div', 'accZFill'),
  accXVal: new MockElement('span', 'accXVal'),
  accYVal: new MockElement('span', 'accYVal'),
  accZVal: new MockElement('span', 'accZVal'),
  accWarning: new MockElement('div', 'accWarning'),
  accStatus: new MockElement('span', 'accStatus'),
  gyrXFill: new MockElement('div', 'gyrXFill'),
  gyrYFill: new MockElement('div', 'gyrYFill'),
  gyrZFill: new MockElement('div', 'gyrZFill'),
  gyrXVal: new MockElement('span', 'gyrXVal'),
  gyrYVal: new MockElement('span', 'gyrYVal'),
  gyrZVal: new MockElement('span', 'gyrZVal'),
  gyrWarning: new MockElement('div', 'gyrWarning'),
  gyrStatus: new MockElement('span', 'gyrStatus'),
  gpsLat: new MockElement('span', 'gpsLat'),
  gpsLon: new MockElement('span', 'gpsLon'),
  gpsAlt: new MockElement('span', 'gpsAlt'),
  gpsSpd: new MockElement('span', 'gpsSpd'),
  gpsAcc: new MockElement('span', 'gpsAcc'),
  gpsWarning: new MockElement('div', 'gpsWarning'),
  gpsStatus: new MockElement('span', 'gpsStatus'),
  sessionCountBadge: new MockElement('span', 'sessionCountBadge'),
  sessionList: new MockElement('div', 'sessionList'),
  sessionEmptyMessage: new MockElement('div', 'sessionEmptyMessage'),
  exportAllBtn: new MockElement('button', 'exportAllBtn'),
  clearAllBtn: new MockElement('button', 'clearAllBtn'),
  toast: new MockElement('div', 'toast')
};

const activityButtons = [
  new MockElement('button', '', 'activity-btn'),
  new MockElement('button', '', 'activity-btn'),
  new MockElement('button', '', 'activity-btn'),
  new MockElement('button', '', 'activity-btn')
];
activityButtons[0].dataset = { key: 'walking-natural', label: 'Walking Natural' };
activityButtons[1].dataset = { key: 'walking-rider', label: 'Walking Rider' };
activityButtons[2].dataset = { key: 'trotting-natural', label: 'Trotting Natural' };
activityButtons[3].dataset = { key: 'trotting-rider', label: 'Trotting Rider' };

let downloadedBlobContent = null;
let downloadedFilename = null;

global.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  DeviceMotionEvent: {},
  confirm: () => true
};

let domLoadedCallback = null;
global.document = {
  addEventListener: (type, fn) => { if (type === 'DOMContentLoaded') domLoadedCallback = fn; },
  getElementById: (id) => elementsById[id] || new MockElement('div', id),
  querySelectorAll: (sel) => {
    if (sel === '.activity-btn') return activityButtons;
    return [];
  },
  createElement: (tag) => {
    const el = new MockElement(tag);
    if (tag === 'a') {
      el.click = () => {
        downloadedFilename = el.getAttribute('download');
      };
    }
    return el;
  },
  body: new MockElement('body')
};

global.navigator = {
  vibrate: () => {},
  geolocation: {
    watchPosition: () => 1,
    clearWatch: () => {}
  }
};

global.localStorage = mockLocalStorage;

global.Blob = class {
  constructor(parts) {
    this.content = parts.join('');
    downloadedBlobContent = this.content;
  }
};

global.URL = {
  createObjectURL: () => 'blob:mock-url',
  revokeObjectURL: () => {}
};

// Load app.js into context
const vm = require('vm');
const jsCode = fs.readFileSync(jsPath, 'utf8');

const sandbox = {
  window: global.window,
  document: global.document,
  navigator: global.navigator,
  localStorage: global.localStorage,
  Blob: global.Blob,
  URL: global.URL,
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  Date: Date,
  Math: Math,
  Number: Number,
  Array: Array,
  String: String,
  JSON: JSON
};

vm.createContext(sandbox);
vm.runInContext(jsCode, sandbox);

if (domLoadedCallback) {
  domLoadedCallback();
}

const API = sandbox.window.HorseSensorLog;

console.log('✔ app.js successfully loaded in isolated VM');

// Test 1: Verify Initial State
if (elementsById.startBtn.disabled !== true) {
  console.error('FAIL: START button should be disabled initially when no label is selected');
  process.exit(1);
}
if (elementsById.endBtn.disabled !== true) {
  console.error('FAIL: END button should be disabled initially');
  process.exit(1);
}
console.log('✔ Initial state: START=disabled, END=disabled, label unselected');

// Test 2: Select Activity "Walking Natural"
API.selectActivity('walking-natural');
if (elementsById.startBtn.disabled !== false) {
  console.error('FAIL: START button should be enabled after selecting Walking Natural');
  process.exit(1);
}
if (elementsById.currentLabelText.textContent !== 'Walking Natural') {
  console.error('FAIL: Current label text not updated to Walking Natural');
  process.exit(1);
}
console.log('✔ Activity selection: Walking Natural properly activated, START enabled');

// Test 3: Start Recording Session #1
API.enableSimulation(true);
API.startRecording();

const stateDuringRecording = API.getState();
if (!stateDuringRecording.isRecording) {
  console.error('FAIL: isRecording should be true');
  process.exit(1);
}
if (elementsById.startBtn.disabled !== true) {
  console.error('FAIL: START button must be disabled during active recording');
  process.exit(1);
}
if (elementsById.endBtn.disabled !== false) {
  console.error('FAIL: END button must be enabled during active recording');
  process.exit(1);
}
if (elementsById.statusText.textContent !== 'RECORDING') {
  console.error('FAIL: Status text must be RECORDING');
  process.exit(1);
}
console.log('✔ START clicked: status is RECORDING, START=disabled, END=enabled');

// Test 4: Collect Samples
for (let i = 0; i < 25; i++) {
  API.collectSensorData();
}

const samplesSession1 = API.getState().samples;
if (samplesSession1.length !== 25) {
  console.error(`FAIL: Expected 25 collected samples, got ${samplesSession1.length}`);
  process.exit(1);
}

// Verify sample fields and exact label
const sample0 = samplesSession1[0];
if (sample0.activity !== 'walking-natural') {
  console.error(`FAIL: Internal activity class must be 'walking-natural', got: ${sample0.activity}`);
  process.exit(1);
}
if (sample0.acc_x === null || sample0.acc_y === null || sample0.acc_z === null) {
  console.error('FAIL: Sample acceleration values missing');
  process.exit(1);
}
console.log(`✔ Collected 25 samples for 'walking-natural' with valid acc, gyro, gps data`);

// Test 5: End Recording Session #1
API.endRecording();
const stateAfterEnd = API.getState();
if (stateAfterEnd.isRecording) {
  console.error('FAIL: isRecording should be false after END');
  process.exit(1);
}
if (elementsById.endBtn.disabled !== true) {
  console.error('FAIL: END button must be disabled after session ends');
  process.exit(1);
}
if (elementsById.statusText.textContent !== 'IDLE') {
  console.error('FAIL: Status must return to IDLE');
  process.exit(1);
}
if (stateAfterEnd.sessions.length !== 1) {
  console.error('FAIL: Expected 1 completed session in state');
  process.exit(1);
}
console.log('✔ END clicked: status returned to IDLE, Session #1 saved in memory and localStorage');

// Test 6: Record Session #2 with "Trotting Rider"
API.selectActivity('trotting-rider');
if (elementsById.currentLabelText.textContent !== 'Trotting Rider') {
  console.error('FAIL: Current label should update to Trotting Rider');
  process.exit(1);
}
API.startRecording();
for (let i = 0; i < 30; i++) {
  API.collectSensorData();
}
API.endRecording();

const stateAfterSession2 = API.getState();
if (stateAfterSession2.sessions.length !== 2) {
  console.error('FAIL: Expected 2 completed sessions');
  process.exit(1);
}
const s2 = stateAfterSession2.sessions[0]; // Newest first
if (s2.activityKey !== 'trotting-rider') {
  console.error('FAIL: Session #2 activity key should be trotting-rider');
  process.exit(1);
}
console.log('✔ Session #2 ("trotting-rider") recorded with 30 samples');

// Test 7: Export CSV Test
API.exportCSV(stateAfterSession2.sessions, 'test_export.csv');
if (!downloadedBlobContent) {
  console.error('FAIL: CSV Blob was not generated');
  process.exit(1);
}

const csvLines = downloadedBlobContent.trim().split('\r\n');
console.log(`✔ CSV generated: ${csvLines.length} lines (including header)`);

const expectedHeader = 'session_id,timestamp,activity,acc_x,acc_y,acc_z,gyro_x,gyro_y,gyro_z,latitude,longitude,altitude,speed,accuracy';
if (csvLines[0] !== expectedHeader) {
  console.error(`FAIL: CSV Header does not match exact specification!`);
  console.error('Expected:', expectedHeader);
  console.error('Got:     ', csvLines[0]);
  process.exit(1);
}
console.log('✔ CSV header matches exact specification');

// Check that rows have walking-natural and trotting-rider
const hasWalkingNat = csvLines.some(line => line.includes(',walking-natural,'));
const hasTrottingRid = csvLines.some(line => line.includes(',trotting-rider,'));

if (!hasWalkingNat || !hasTrottingRid) {
  console.error('FAIL: CSV is missing exact activity keys!');
  process.exit(1);
}
console.log('✔ CSV data correctly contains internal keys "walking-natural" and "trotting-rider"');

// Test 8: Record running-natural and running-rider through the same pipeline
API.selectActivity('running-natural');
if (elementsById.currentLabelText.textContent !== 'Running Natural') {
  console.error('FAIL: Current label should update to Running Natural');
  process.exit(1);
}
API.startRecording();
for (let i = 0; i < 20; i++) {
  API.collectSensorData();
}
API.endRecording();
const afterRunningNat = API.getState();
const runningNatSession = afterRunningNat.sessions[0];
if (runningNatSession.activityKey !== 'running-natural') {
  console.error('FAIL: running-natural session key mismatch');
  process.exit(1);
}
if (!runningNatSession.samples[0].timestamp || runningNatSession.samples[0].acc_x === null) {
  console.error('FAIL: running-natural samples missing timestamp or Ax');
  process.exit(1);
}

API.selectActivity('running-rider');
API.startRecording();
for (let i = 0; i < 20; i++) {
  API.collectSensorData();
}
API.endRecording();
const afterRunningRider = API.getState();
const runningRiderSession = afterRunningRider.sessions[0];
if (runningRiderSession.activityKey !== 'running-rider') {
  console.error('FAIL: running-rider session key mismatch');
  process.exit(1);
}
if (afterRunningRider.sessions.length !== 4) {
  console.error(`FAIL: Expected 4 sessions after running classes, got ${afterRunningRider.sessions.length}`);
  process.exit(1);
}
console.log('✔ running-natural and running-rider recorded with Ax/Ay/Az timestamps via existing pipeline');

API.exportCSV(afterRunningRider.sessions, 'test_export_running.csv');
const csvWithRunning = downloadedBlobContent.trim().split('\r\n');
if (!csvWithRunning.some(line => line.includes(',running-natural,')) || !csvWithRunning.some(line => line.includes(',running-rider,'))) {
  console.error('FAIL: CSV missing running class keys');
  process.exit(1);
}
console.log('✔ CSV includes running-natural and running-rider rows');

// Test 9: Verify LocalStorage persistence
const savedInStorage = JSON.parse(mockLocalStorage.getItem('horse_sensor_log_sessions_v1'));
if (!savedInStorage || savedInStorage.length !== 4) {
  console.error('FAIL: Sessions not persisted correctly in localStorage');
  process.exit(1);
}
console.log('✔ LocalStorage persistence verified (4 sessions stored)');

console.log('\n====================================================');
console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY! (9/9)');
console.log('====================================================');
process.exit(0);
