/**
 * ==============================================================================
 * HORSE SENSOR LOG - Equine Movement Data Collection Interface
 * Research & University Dataset Collection Tool
 *
 * Supported Gait Classes:
 * 1. Walking Natural  -> walking-natural
 * 2. Walking Rider    -> walking-rider
 * 3. Trotting Natural -> trotting-natural
 * 4. Trotting Rider   -> trotting-rider
 * 5. Running Natural  -> running-natural
 * 6. Running Rider    -> running-rider
 * ==============================================================================
 */

'use strict';

/* ==============================================================================
   1. FIREBASE CONFIGURATION
   ============================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyDc2mVsrTgS5SAunGIR1_ipMovAQp-Y9tk",
  authDomain: "horsedigitaltwin.firebaseapp.com",
  projectId: "horsedigitaltwin",
  storageBucket: "horsedigitaltwin.firebasestorage.app",
  messagingSenderId: "1058018644516",
  appId: "1:1058018644516:web:3cff651b918ea1aff27eb1",
  measurementId: "G-PFMLZ8MC4V"
};

window.horseFirebaseReady = (async () => {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    const auth = firebase.auth();
    const db = firebase.firestore();

    const credential = await auth.signInAnonymously();

    window.horseFirebase = {
      auth,
      db,
      user: credential.user
    };

    console.log("Firebase connected successfully.");
    console.log("Anonymous user ID:", credential.user.uid);

    return true;
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    window.horseFirebase = null;
    return false;
  }
})();

/* ==============================================================================
   2. CONSTANTS & ACTIVITY CLASSES
   ============================================================================== */

const ACTIVITY_CLASSES = {
  'walking-natural': {
    key: 'walking-natural',
    label: 'Walking Natural',
    badge: 'Class 01',
    color: '#00e5ff',
    baseFrequency: 1.6,
    baseSpeed: 1.5
  },

  'walking-rider': {
    key: 'walking-rider',
    label: 'Walking Rider',
    badge: 'Class 02',
    color: '#3b82f6',
    baseFrequency: 1.5,
    baseSpeed: 1.4
  },

  'trotting-natural': {
    key: 'trotting-natural',
    label: 'Trotting Natural',
    badge: 'Class 03',
    color: '#10b981',
    baseFrequency: 2.8,
    baseSpeed: 3.8
  },

  'trotting-rider': {
    key: 'trotting-rider',
    label: 'Trotting Rider',
    badge: 'Class 04',
    color: '#f59e0b',
    baseFrequency: 2.6,
    baseSpeed: 3.6
  },

  'running-natural': {
    key: 'running-natural',
    label: 'Running Natural',
    badge: 'Class 05',
    color: '#ef4444',
    baseFrequency: 3.6,
    baseSpeed: 6.5
  },

  'running-rider': {
    key: 'running-rider',
    label: 'Running Rider',
    badge: 'Class 06',
    color: '#ec4899',
    baseFrequency: 3.4,
    baseSpeed: 6.2
  }
};

const TARGET_SAMPLE_RATE_HZ = 100;
const SAMPLE_RATE_MS = 10;
const MAX_ACC_SCALE = 20.0; // +/- 20 m/s²
const MAX_GYR_SCALE = 10.0; // +/- 10 rad/s
const STORAGE_KEY = 'horse_sensor_log_sessions_v1';

/* ==============================================================================
   3. APPLICATION STATE
   ============================================================================== */

const state = {
  selectedActivityKey: null,
  isRecording: false,
  startTime: null,
  timerIntervalId: null,
  collectIntervalId: null,
  displayIntervalId: null,
  samples: [],
  sessions: [],
  hardwareSensorDetected: false,
  simulationEnabled: false,
  gpsWatchId: null,
  sessionCounter: 1,
  lastMotionEventAt: null,
  achievedSampleRateHz: null
};

const liveSensors = {
  acc: {
    x: null,
    y: null,
    z: null
  },

  gyro: {
    x: null,
    y: null,
    z: null
  },

  gps: {
    latitude: null,
    longitude: null,
    altitude: null,
    speed: null,
    accuracy: null
  }
};

const simState = {
  phase: 0,
  lat: 51.5074,
  lon: -0.1278,
  alt: 45.0,
  speed: 0.0
};

/* ==============================================================================
   4. DOM ELEMENT REFERENCES
   ============================================================================== */

const DOM = {
  statusPill: document.getElementById('statusPill'),
  statusDot: document.getElementById('statusDot'),
  statusText: document.getElementById('statusText'),

  simCheckbox: document.getElementById('simCheckbox'),
  simToggleWrap: document.getElementById('simToggleWrap'),

  activityGrid: document.getElementById('activityGrid'),
  activityButtons: document.querySelectorAll('.activity-btn'),

  currentLabelValue: document.getElementById('currentLabelValue'),
  currentLabelText: document.getElementById('currentLabelText'),
  internalKeyTag: document.getElementById('internalKeyTag'),

  startBtn: document.getElementById('startBtn'),
  endBtn: document.getElementById('endBtn'),

  recordingBanner: document.getElementById('recordingBanner'),
  bannerStatusText: document.getElementById('bannerStatusText'),
  bannerActivityText: document.getElementById('bannerActivityText'),

  timerDisplay: document.getElementById('timerDisplay'),
  sampleCountDisplay: document.getElementById('sampleCountDisplay'),
  samplingRateTag: document.getElementById('samplingRateTag'),

  permissionBtn: document.getElementById('permissionBtn'),

  accXFill: document.getElementById('accXFill'),
  accYFill: document.getElementById('accYFill'),
  accZFill: document.getElementById('accZFill'),

  accXVal: document.getElementById('accXVal'),
  accYVal: document.getElementById('accYVal'),
  accZVal: document.getElementById('accZVal'),

  accWarning: document.getElementById('accWarning'),
  accStatus: document.getElementById('accStatus'),

  gyrXFill: document.getElementById('gyrXFill'),
  gyrYFill: document.getElementById('gyrYFill'),
  gyrZFill: document.getElementById('gyrZFill'),

  gyrXVal: document.getElementById('gyrXVal'),
  gyrYVal: document.getElementById('gyrYVal'),
  gyrZVal: document.getElementById('gyrZVal'),

  gyrWarning: document.getElementById('gyrWarning'),
  gyrStatus: document.getElementById('gyrStatus'),

  gpsLat: document.getElementById('gpsLat'),
  gpsLon: document.getElementById('gpsLon'),
  gpsAlt: document.getElementById('gpsAlt'),
  gpsSpd: document.getElementById('gpsSpd'),
  gpsAcc: document.getElementById('gpsAcc'),

  gpsWarning: document.getElementById('gpsWarning'),
  gpsStatus: document.getElementById('gpsStatus'),

  sessionCountBadge: document.getElementById('sessionCountBadge'),
  sessionList: document.getElementById('sessionList'),
  sessionEmptyMessage: document.getElementById('sessionEmptyMessage'),

  exportAllBtn: document.getElementById('exportAllBtn'),
  clearAllBtn: document.getElementById('clearAllBtn'),

  toast: document.getElementById('toast')
};

/* ==============================================================================
   5. INITIALIZATION
   ============================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  if (DOM.simToggleWrap) DOM.simToggleWrap.hidden = true;
  initSensors();
  initEventListeners();
  loadSessions();
  updateControlsUI();
  updateSensorUI();

  state.displayIntervalId = setInterval(
    updateSensorUI,
    SAMPLE_RATE_MS
  );

  setTimeout(detectSensorEnvironment, 1200);
});

function detectSensorEnvironment() {
  if (!state.hardwareSensorDetected && !state.simulationEnabled) {
    DOM.accWarning.classList.add('visible');
    DOM.gyrWarning.classList.add('visible');

    DOM.accStatus.textContent = 'STANDBY';
    DOM.gyrStatus.textContent = 'STANDBY';

    showToast(
      'Hardware motion sensors not detected. Real data collection requires a compatible mobile device over HTTPS.'
    );
  }
}

/* ==============================================================================
   6. EVENT LISTENERS
   ============================================================================== */

function initEventListeners() {

  DOM.activityButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectActivity(btn.dataset.key);
    });
  });

  DOM.startBtn.addEventListener('click', startRecording);

  DOM.endBtn.addEventListener('click', endRecording);

  DOM.exportAllBtn.addEventListener('click', () => {
    exportCSV(
      state.sessions,
      `horse_sensor_dataset_all_${Date.now()}.csv`
    );
  });

  DOM.clearAllBtn.addEventListener('click', () => {
    if (!state.sessions.length) return;

    const confirmClear = window.confirm(
      'Are you sure you want to clear all recorded sessions? This cannot be undone.'
    );

    if (confirmClear) {
      state.sessions = [];
      saveSessionsToStorage();
      renderSessions();
      showToast('All recorded sessions cleared');
    }
  });

  if (DOM.permissionBtn) {
    DOM.permissionBtn.addEventListener(
      'click',
      requestMotionPermission
    );
  }

  window.addEventListener('beforeunload', (event) => {
    if (state.isRecording) {
      event.preventDefault();

      event.returnValue =
        'A recording is currently in progress. If you leave now, unsaved sensor samples will be lost.';

      return event.returnValue;
    }
  });
}

/* ==============================================================================
   7. ACTIVITY SELECTION
   ============================================================================== */

function selectActivity(activityKey) {

  if (!ACTIVITY_CLASSES[activityKey]) {
    console.error('Invalid activity class:', activityKey);
    return;
  }

  // Prevent changing the activity during an active recording.
  if (state.isRecording) {
    showToast(
      'End the current recording before changing activity'
    );
    return;
  }

  state.selectedActivityKey = activityKey;

  const activity = ACTIVITY_CLASSES[activityKey];

  DOM.activityButtons.forEach((btn) => {
    const isSelected = btn.dataset.key === activityKey;

    btn.classList.toggle('selected', isSelected);

    btn.setAttribute(
      'aria-pressed',
      String(isSelected)
    );
  });

  DOM.currentLabelValue.classList.add('has-label');

  DOM.currentLabelText.textContent = activity.label;

  DOM.internalKeyTag.textContent = activity.key;

  DOM.internalKeyTag.style.display = 'inline-block';

  DOM.bannerActivityText.textContent =
    `Ready to record: ${activity.label}`;

  updateControlsUI();
}

/* ==============================================================================
   8. RECORDING CONTROLS
   ============================================================================== */

function startRecording() {

  if (state.isRecording) {
    console.warn('Recording is already in progress.');
    return;
  }

  if (!state.selectedActivityKey) {
    showToast(
      'Please select an activity class before starting'
    );
    return;
  }

  const currentActivity =
    ACTIVITY_CLASSES[state.selectedActivityKey];

  state.isRecording = true;
  state.startTime = Date.now();
  state.samples = [];

  DOM.statusPill.classList.add('recording');
  DOM.statusText.textContent = 'RECORDING';

  DOM.recordingBanner.classList.add('active');

  DOM.bannerStatusText.textContent = '● RECORDING';

  DOM.bannerActivityText.textContent =
    currentActivity.label;

  DOM.timerDisplay.textContent = '00:00';

  DOM.sampleCountDisplay.textContent = '0 SAMPLES';

  state.achievedSampleRateHz = null;

  updateSamplingRateTag(null);

  updateControlsUI();

  state.timerIntervalId = setInterval(() => {

    if (!state.isRecording) return;

    const elapsedSeconds = Math.floor(
      (Date.now() - state.startTime) / 1000
    );

    DOM.timerDisplay.textContent =
      formatTimer(elapsedSeconds);

  }, 500);



  if (navigator.vibrate) {
    navigator.vibrate(100);
  }

  showToast(
    `Recording started: ${currentActivity.label}`
  );
}

function endRecording() {

  if (!state.isRecording) {
    console.warn('No active recording to stop.');
    return;
  }

  clearInterval(state.collectIntervalId);
  clearInterval(state.timerIntervalId);

  state.collectIntervalId = null;
  state.timerIntervalId = null;

  state.isRecording = false;

  const elapsedMs = Date.now() - state.startTime;

  const totalDurationSeconds =
    (elapsedMs / 1000).toFixed(1);

  const formattedDuration = formatTimer(
    Math.floor(totalDurationSeconds)
  );

  const durationSec = elapsedMs / 1000;

  const achievedHz = durationSec > 0
    ? state.samples.length / durationSec
    : 0;

  state.achievedSampleRateHz = achievedHz;

  updateSamplingRateTag(achievedHz);

  DOM.timerDisplay.textContent = formattedDuration;

  DOM.statusPill.classList.remove('recording');

  DOM.statusText.textContent = 'IDLE';

  DOM.recordingBanner.classList.remove('active');

  DOM.bannerStatusText.textContent = 'COMPLETED';

  const activity =
    ACTIVITY_CLASSES[state.selectedActivityKey];

  DOM.bannerActivityText.textContent =
    `Saved session with ${state.samples.length} samples`;

  if (state.samples.length > 0) {

    const sessionObj = {
      id: Date.now(),

      sessionNumber: state.sessionCounter++,

      activityKey: state.selectedActivityKey,

      activityLabel: activity.label,

      durationSeconds: parseFloat(totalDurationSeconds),

      durationFormatted: formattedDuration,

      sampleCount: state.samples.length,

      targetSampleRateHz: TARGET_SAMPLE_RATE_HZ,

      achievedSampleRateHz: Number(
        achievedHz.toFixed(2)
      ),

      timestamp: new Date().toISOString(),

      displayTime: new Date().toLocaleTimeString(
        [],
        {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }
      ),

      samples: [...state.samples]
    };

    saveSession(sessionObj);

    // Upload to Firebase without blocking the local backup.
    uploadSessionToFirestore(sessionObj).catch((error) => {
      console.error(
        'Firebase upload failed. Local backup is preserved:',
        error
      );

      showToast(
        'Saved locally - Firebase upload failed'
      );
    });

    showToast(
      `Session #${sessionObj.sessionNumber} saved (${sessionObj.sampleCount} samples)`
    );

  } else {
    showToast('Session ended with 0 samples');
  }

  updateControlsUI();

  if (navigator.vibrate) {
    navigator.vibrate([60, 50, 60]);
  }
}

/* ==============================================================================
   9. UPDATE CONTROLS UI
   ============================================================================== */

function updateControlsUI() {

  // Lock all activity buttons during recording.
  DOM.activityButtons.forEach((btn) => {
    btn.disabled = state.isRecording;
  });

  if (state.isRecording) {

    DOM.startBtn.disabled = true;

    DOM.endBtn.disabled = false;

    DOM.startBtn.title = 'Recording in progress';

    DOM.endBtn.title =
      'Stop current recording session';

  } else {

    DOM.endBtn.disabled = true;

    DOM.endBtn.title = 'Recording is not active';

    DOM.startBtn.disabled =
      !state.selectedActivityKey;

    DOM.startBtn.title = state.selectedActivityKey
      ? 'Begin recording session'
      : 'Select an activity class first';
  }

  DOM.exportAllBtn.disabled =
    state.sessions.length === 0;

  DOM.clearAllBtn.disabled =
    state.sessions.length === 0;
}

/* ==============================================================================
   10. DATA COLLECTION & SAMPLING
   ============================================================================== */

function collectSensorData() {

  if (!state.isRecording) return;

  const sensorValues = [
    liveSensors.acc.x, liveSensors.acc.y, liveSensors.acc.z,
    liveSensors.gyro.x, liveSensors.gyro.y, liveSensors.gyro.z
  ];

  if (!sensorValues.every(Number.isFinite)) return;

  const currentActivityKey =
    state.selectedActivityKey;

  const timestampMs = Date.now();

  const sample = {

    session_id: state.sessionCounter,

    timestamp: new Date(timestampMs).toISOString(),

    timestamp_ms: timestampMs,

    activity: currentActivityKey,

    acc_x: liveSensors.acc.x !== null
      ? Number(liveSensors.acc.x.toFixed(6))
      : null,

    acc_y: liveSensors.acc.y !== null
      ? Number(liveSensors.acc.y.toFixed(6))
      : null,

    acc_z: liveSensors.acc.z !== null
      ? Number(liveSensors.acc.z.toFixed(6))
      : null,

    gyro_x: liveSensors.gyro.x !== null
      ? Number(liveSensors.gyro.x.toFixed(6))
      : null,

    gyro_y: liveSensors.gyro.y !== null
      ? Number(liveSensors.gyro.y.toFixed(6))
      : null,

    gyro_z: liveSensors.gyro.z !== null
      ? Number(liveSensors.gyro.z.toFixed(6))
      : null,

    latitude: liveSensors.gps.latitude !== null
      ? Number(liveSensors.gps.latitude.toFixed(6))
      : null,

    longitude: liveSensors.gps.longitude !== null
      ? Number(liveSensors.gps.longitude.toFixed(6))
      : null,

    altitude: liveSensors.gps.altitude !== null
      ? Number(liveSensors.gps.altitude.toFixed(1))
      : null,

    speed: liveSensors.gps.speed !== null
      ? Number(liveSensors.gps.speed.toFixed(2))
      : null,

    accuracy: liveSensors.gps.accuracy !== null
      ? Number(liveSensors.gps.accuracy.toFixed(1))
      : null
  };

  state.samples.push(sample);

  DOM.sampleCountDisplay.textContent =
    `${state.samples.length} SAMPLES`;

  if (state.startTime) {

    const elapsedSec =
      (timestampMs - state.startTime) / 1000;

    if (elapsedSec >= 0.25) {
      updateSamplingRateTag(
        state.samples.length / elapsedSec
      );
    }
  }
}

/* ==============================================================================
   11. SENSOR HARDWARE LISTENERS & PERMISSIONS
   ============================================================================== */

function initSensors() {

  if (
    typeof window !== 'undefined' &&
    window.DeviceMotionEvent
  ) {

    if (
      typeof window.DeviceMotionEvent.requestPermission ===
      'function'
    ) {

      if (DOM.permissionBtn) {
        DOM.permissionBtn.classList.add('visible');
      }

    } else {

      startMotionListener();
    }

  } else {

    DOM.accWarning.classList.add('visible');

    DOM.gyrWarning.classList.add('visible');
  }

  initGPS();
}

async function requestMotionPermission() {

  if (
    typeof window !== 'undefined' &&
    window.DeviceMotionEvent &&
    typeof window.DeviceMotionEvent.requestPermission ===
    'function'
  ) {

    try {

      const response =
        await window.DeviceMotionEvent.requestPermission();

      if (response === 'granted') {

        DOM.permissionBtn.classList.remove('visible');

        startMotionListener();

        showToast(
          'Motion sensors permission granted'
        );

      } else {

        showToast(
          'Motion sensor permission denied'
        );
      }

    } catch (err) {

      console.warn(
        'Error requesting motion permission:',
        err
      );

      showToast(
        'Could not access motion sensors'
      );
    }
  }
}

function startMotionListener() {

  window.addEventListener(
    'devicemotion',
    handleMotionEvent,
    { passive: true }
  );
}

function handleMotionEvent(event) {
  if (!event) return;

  const rawAcc =
    event.accelerationIncludingGravity ||
    event.acceleration;
  const rawRot = event.rotationRate;

  if (!rawAcc || !rawRot) return;

  const values = [
    rawAcc.x, rawAcc.y, rawAcc.z,
    rawRot.alpha, rawRot.beta, rawRot.gamma
  ];

  if (!values.every(Number.isFinite)) return;

  const degToRad = Math.PI / 180;

  liveSensors.acc.x = rawAcc.x;
  liveSensors.acc.y = rawAcc.y;
  liveSensors.acc.z = rawAcc.z;

  liveSensors.gyro.x = rawRot.alpha * degToRad;
  liveSensors.gyro.y = rawRot.beta * degToRad;
  liveSensors.gyro.z = rawRot.gamma * degToRad;

  state.lastMotionEventAt = Date.now();
  state.hardwareSensorDetected = true;

  DOM.accWarning.classList.remove('visible');
  DOM.accStatus.textContent = 'ACTIVE';
  DOM.gyrWarning.classList.remove('visible');
  DOM.gyrStatus.textContent = 'ACTIVE';

  if (state.isRecording) {
    collectSensorData();
  }
}
/* ==============================================================================
   12. GPS
   ============================================================================== */

function initGPS() {

  if (!navigator.geolocation) {

    DOM.gpsWarning.classList.add('visible');

    DOM.gpsStatus.textContent = 'UNAVAILABLE';

    return;
  }

  try {

    state.gpsWatchId =
      navigator.geolocation.watchPosition(

        (position) => {

          const coords = position.coords;

          DOM.gpsWarning.classList.remove('visible');

          DOM.gpsStatus.textContent = 'LOCKED';

          if (!state.simulationEnabled) {

            liveSensors.gps.latitude =
              coords.latitude;

            liveSensors.gps.longitude =
              coords.longitude;

            liveSensors.gps.altitude =
              coords.altitude;

            liveSensors.gps.speed =
              coords.speed;

            liveSensors.gps.accuracy =
              coords.accuracy;
          }
        },

        (error) => {

          console.warn(
            'Geolocation warning/error:',
            error.message
          );

          DOM.gpsWarning.classList.add('visible');

          DOM.gpsStatus.textContent = 'DENIED/IDLE';
        },

        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 15000
        }
      );

  } catch (error) {

    console.warn(
      'Geolocation failed to initialize:',
      error
    );

    DOM.gpsWarning.classList.add('visible');
  }
}

/* ==============================================================================
   13. EQUINE GAIT SIMULATION
   FOR LAPTOP / DESKTOP TESTING ONLY
   ============================================================================== */

function updateSensorUI() {

  // Accelerometer.
  updateDeflectionBar(
    DOM.accXFill,
    liveSensors.acc.x,
    MAX_ACC_SCALE
  );

  updateDeflectionBar(
    DOM.accYFill,
    liveSensors.acc.y,
    MAX_ACC_SCALE
  );

  updateDeflectionBar(
    DOM.accZFill,
    liveSensors.acc.z,
    MAX_ACC_SCALE
  );

  DOM.accXVal.textContent =
    formatNumeric(liveSensors.acc.x, 6);

  DOM.accYVal.textContent =
    formatNumeric(liveSensors.acc.y, 6);

  DOM.accZVal.textContent =
    formatNumeric(liveSensors.acc.z, 6);

  // Gyroscope.
  updateDeflectionBar(
    DOM.gyrXFill,
    liveSensors.gyro.x,
    MAX_GYR_SCALE
  );

  updateDeflectionBar(
    DOM.gyrYFill,
    liveSensors.gyro.y,
    MAX_GYR_SCALE
  );

  updateDeflectionBar(
    DOM.gyrZFill,
    liveSensors.gyro.z,
    MAX_GYR_SCALE
  );

  DOM.gyrXVal.textContent =
    formatNumeric(liveSensors.gyro.x, 6);

  DOM.gyrYVal.textContent =
    formatNumeric(liveSensors.gyro.y, 6);

  DOM.gyrZVal.textContent =
    formatNumeric(liveSensors.gyro.z, 6);

  // GPS.
  DOM.gpsLat.textContent =
    liveSensors.gps.latitude !== null
      ? liveSensors.gps.latitude.toFixed(6)
      : '—';

  DOM.gpsLon.textContent =
    liveSensors.gps.longitude !== null
      ? liveSensors.gps.longitude.toFixed(6)
      : '—';

  DOM.gpsAlt.textContent =
    liveSensors.gps.altitude !== null
      ? liveSensors.gps.altitude.toFixed(1)
      : '—';

  DOM.gpsSpd.textContent =
    liveSensors.gps.speed !== null
      ? liveSensors.gps.speed.toFixed(2)
      : '—';

  DOM.gpsAcc.textContent =
    liveSensors.gps.accuracy !== null
      ? `±${liveSensors.gps.accuracy.toFixed(1)}`
      : '—';
}

function updateDeflectionBar(element, value, maxScale) {

  if (!element) return;

  if (
    value === null ||
    value === undefined ||
    isNaN(value)
  ) {

    element.style.width = '0%';

    element.style.left = '50%';

    return;
  }

  const normalized = Math.max(
    -1.0,
    Math.min(1.0, value / maxScale)
  );

  if (normalized >= 0) {

    element.style.left = '50%';

    element.style.width =
      `${normalized * 50}%`;

  } else {

    const width =
      Math.abs(normalized) * 50;

    element.style.left =
      `${50 - width}%`;

    element.style.width =
      `${width}%`;
  }
}

function formatNumeric(val, decimals = 6) {

  if (
    val === null ||
    val === undefined ||
    isNaN(val)
  ) {
    return '0.000000';
  }

  const prefix = val >= 0 ? '+' : '';

  return prefix + val.toFixed(decimals);
}

function updateSamplingRateTag(measuredHz) {

  if (!DOM.samplingRateTag) return;

  if (
    measuredHz === null ||
    measuredHz === undefined ||
    isNaN(measuredHz)
  ) {

    DOM.samplingRateTag.textContent =
      `Target ${TARGET_SAMPLE_RATE_HZ} Hz`;

    return;
  }

  const rounded = Number(measuredHz.toFixed(1));

  if (
    rounded >= TARGET_SAMPLE_RATE_HZ * 0.9
  ) {

    DOM.samplingRateTag.textContent =
      `${rounded} Hz`;

  } else {

    DOM.samplingRateTag.textContent =
      `Measured ${rounded} Hz (target ${TARGET_SAMPLE_RATE_HZ})`;
  }
}

function formatTimer(totalSeconds) {

  const m = Math.floor(totalSeconds / 60);

  const s = totalSeconds % 60;

  return (
    `${String(m).padStart(2, '0')}:` +
    `${String(s).padStart(2, '0')}`
  );
}

/* ==============================================================================
   15. FIREBASE SESSION UPLOAD
   ============================================================================== */

async function uploadSessionToFirestore(session) {

  const ready = await window.horseFirebaseReady;

  if (!ready || !window.horseFirebase) {
    throw new Error(
      'Firebase is not available. Session remains saved locally.'
    );
  }

  const db = window.horseFirebase.db;

  const user = window.horseFirebase.user;

  const collection = db.collection('stage1_horse_samples');

  const sessionId = String(session.id);

  // Upload session metadata.
  const metadataRef = await collection.add({

    source: 'screen1_data_collection',

    document_type: 'session_metadata',

    session_id: sessionId,

    user_id: user.uid,

    activity: session.activityKey,

    activity_label: session.activityLabel,

    sample_count: session.sampleCount,

    duration_seconds: session.durationSeconds,

    target_sample_rate_hz:
      session.targetSampleRateHz,

    achieved_sample_rate_hz:
      session.achievedSampleRateHz,

    timestamp: session.timestamp,

    uploaded_at: new Date().toISOString()
  });

  // Upload sensor readings in small documents.
  const chunkSize = 200;

  const samples = session.samples || [];

  const totalChunks =
    Math.ceil(samples.length / chunkSize);

  for (
    let batchStart = 0;
    batchStart < totalChunks;
    batchStart += 10
  ) {

    const tasks = [];

    for (
      let chunkIndex = batchStart;
      chunkIndex < Math.min(
        batchStart + 10,
        totalChunks
      );
      chunkIndex++
    ) {

      const start = chunkIndex * chunkSize;

      const chunk = samples.slice(
        start,
        start + chunkSize
      );

      tasks.push(
        collection.add({

          source: 'screen1_data_collection',

          document_type: 'sensor_chunk',

          session_id: sessionId,

          session_document_id: metadataRef.id,

          user_id: user.uid,

          activity: session.activityKey,

          chunk_index: chunkIndex,

          total_chunks: totalChunks,

          sample_count: chunk.length,

          samples: chunk,

          uploaded_at: new Date().toISOString()
        })
      );
    }

    await Promise.all(tasks);
  }

  console.log(
    'Screen 1 session uploaded successfully:',
    {
      sessionId,
      activity: session.activityKey,
      samples: samples.length,
      chunks: totalChunks
    }
  );

  showToast(
    'Dataset uploaded to Firebase successfully'
  );

  return metadataRef.id;
}

/* ==============================================================================
   16. SESSION MANAGEMENT & LOCAL STORAGE
   ============================================================================== */

function saveSession(session) {

  state.sessions.unshift(session);

  saveSessionsToStorage();

  renderSessions();
}

function saveSessionsToStorage() {

  try {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state.sessions)
    );

  } catch (error) {

    console.error(
      'Failed to save sessions to localStorage:',
      error
    );

    showToast(
      'Storage quota warning: consider exporting your dataset'
    );
  }
}

function loadSessions() {

  try {

    const raw = localStorage.getItem(STORAGE_KEY);

    if (raw) {

      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {

        state.sessions = parsed;

        state.sessionCounter =
          state.sessions.reduce(
            (max, session) =>
              Math.max(
                max,
                (session.sessionNumber || 0)
              ),
            0
          ) + 1;
      }
    }

  } catch (error) {

    console.warn(
      'Error reading stored sessions:',
      error
    );

    state.sessions = [];
  }

  renderSessions();
}

function renderSessions() {

  DOM.sessionCountBadge.textContent =
    state.sessions.length;

  if (state.sessions.length === 0) {

    DOM.sessionEmptyMessage.style.display = 'block';

    DOM.exportAllBtn.disabled = true;

    DOM.clearAllBtn.disabled = true;

    DOM.sessionList
      .querySelectorAll('.session-item')
      .forEach((item) => item.remove());

    return;
  }

  DOM.sessionEmptyMessage.style.display = 'none';

  DOM.exportAllBtn.disabled = false;

  DOM.clearAllBtn.disabled = false;

  DOM.sessionList
    .querySelectorAll('.session-item')
    .forEach((item) => item.remove());

  state.sessions.forEach((session) => {

    const item = document.createElement('div');

    item.className = 'session-item';

    const classConfig =
      ACTIVITY_CLASSES[session.activityKey] || {
        color: '#00e5ff',
        label: session.activityLabel || 'Walking Natural'
      };

    item.innerHTML = `
      <div
        class="session-badge-bar"
        style="background: ${classConfig.color};">
      </div>

      <div class="session-meta-wrap">

        <div class="session-title-line">

          <span class="session-id-tag">
            Session #${session.sessionNumber || 1}
          </span>

          <span class="session-label-text">
            ${escapeHTML(classConfig.label)}
          </span>

          <span class="session-internal-key">
            ${escapeHTML(session.activityKey)}
          </span>

        </div>

        <div class="session-stats-line">

          <span>🕒 ${session.displayTime || '00:00'}</span>

          <span>⏱ ${session.durationFormatted || '00:00'}</span>

          <span>📊 ${session.sampleCount} samples</span>

        </div>

      </div>

      <div class="session-item-actions">

        <button
          type="button"
          class="btn-item-export"
          data-id="${session.id}"
          title="Export this session as CSV">

          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="currentColor">

            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>

          </svg>

          <span>CSV</span>

        </button>

        <button
          type="button"
          class="btn-item-del"
          data-id="${session.id}"
          title="Delete this session">

          ✕

        </button>

      </div>
    `;

    const exportBtn =
      item.querySelector('.btn-item-export');

    exportBtn.addEventListener('click', () => {

      const filename =
        `horse_session_${session.sessionNumber}_${session.activityKey}_${Date.now()}.csv`;

      exportCSV([session], filename);
    });

    const delBtn =
      item.querySelector('.btn-item-del');

    delBtn.addEventListener('click', () => {
      deleteSession(session.id);
    });

    DOM.sessionList.appendChild(item);
  });
}

function deleteSession(sessionId) {

  state.sessions = state.sessions.filter(
    (session) => session.id !== sessionId
  );

  saveSessionsToStorage();

  renderSessions();

  showToast('Session removed');
}

/* ==============================================================================
   17. CSV EXPORT ENGINE
   ============================================================================== */

function exportCSV(sessionsList, filename) {

  if (
    !sessionsList ||
    sessionsList.length === 0
  ) {

    showToast(
      'No session data available to export'
    );

    return;
  }

  const allSamples = [];

  sessionsList.forEach((session) => {

    if (
      session.samples &&
      Array.isArray(session.samples)
    ) {

      session.samples.forEach((sample) => {

        allSamples.push({

          ...sample,

          session_id:
            session.sessionNumber ||
            sample.session_id ||
            1
        });
      });
    }
  });

  if (allSamples.length === 0) {

    showToast('Sessions contain 0 samples');

    return;
  }

  const csvHeaders = [
    'session_id',
    'timestamp',
    'activity',
    'acc_x',
    'acc_y',
    'acc_z',
    'gyro_x',
    'gyro_y',
    'gyro_z',
    'latitude',
    'longitude',
    'altitude',
    'speed',
    'accuracy'
  ];

  const fmt = (value, decimals = 6) => {

    if (
      value === null ||
      value === undefined ||
      isNaN(value)
    ) {
      return '';
    }

    return Number(value).toFixed(decimals);
  };

  const csvRows = [
    csvHeaders.join(',')
  ];

  allSamples.forEach((row) => {

    const rowValues = [

      row.session_id,

      row.timestamp || '',

      row.activity || '',

      fmt(row.acc_x, 6),

      fmt(row.acc_y, 6),

      fmt(row.acc_z, 6),

      fmt(row.gyro_x, 6),

      fmt(row.gyro_y, 6),

      fmt(row.gyro_z, 6),

      fmt(row.latitude, 6),

      fmt(row.longitude, 6),

      fmt(row.altitude, 1),

      fmt(row.speed, 2),

      fmt(row.accuracy, 1)
    ];

    csvRows.push(rowValues.join(','));
  });

  const csvContent =
    csvRows.join('\r\n');

  const blob = new Blob(
    [csvContent],
    {
      type: 'text/csv;charset=utf-8;'
    }
  );

  const url = URL.createObjectURL(blob);

  const downloadLink =
    document.createElement('a');

  downloadLink.setAttribute('href', url);

  downloadLink.setAttribute('download', filename);

  downloadLink.style.display = 'none';

  document.body.appendChild(downloadLink);

  downloadLink.click();

  document.body.removeChild(downloadLink);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 2000);

  showToast(
    `Exported ${allSamples.length} rows to ${filename}`
  );
}

/* ==============================================================================
   18. UTILITIES & TOAST FEEDBACK
   ============================================================================== */

let toastTimeoutId = null;

function showToast(message) {

  if (!DOM.toast) return;

  DOM.toast.textContent = message;

  DOM.toast.classList.add('show');

  clearTimeout(toastTimeoutId);

  toastTimeoutId = setTimeout(() => {

    DOM.toast.classList.remove('show');

  }, 3200);
}

function escapeHTML(str) {

  if (!str) return '';

  return String(str)

    .replace(/&/g, '&amp;')

    .replace(/</g, '&lt;')

    .replace(/>/g, '&gt;')

    .replace(/"/g, '&quot;')

    .replace(/'/g, '&#39;');
}

/* ==============================================================================
   19. PUBLIC RESEARCH API
   ============================================================================== */

window.HorseSensorLog = {

  startRecording,

  endRecording,

  selectActivity,

  collectSensorData,

  updateSensorUI,

  saveSession,

  loadSessions,

  exportCSV,


  getState: () => ({ ...state })
};
