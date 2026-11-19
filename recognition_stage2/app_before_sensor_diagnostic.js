
'use strict';

// ==========================================
// FIREBASE CONFIGURATION
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyDc2mVsrTgS5SAunGIR1_ipMovAQp-Y9tk",
  authDomain: "horsedigitaltwin.firebaseapp.com",
  projectId: "horsedigitaltwin",
  storageBucket: "horsedigitaltwin.firebasestorage.app",
  messagingSenderId: "1058018644516",
  appId: "1:1058018644516:web:3cff651b918ea1aff27eb1",
  measurementId: "G-PFMLZ8MC4V"
};

// ==========================================
// SETTINGS
// ==========================================

const COLLECTION_NAME = "horse_samples";
const SOURCE_NAME = "screen2_recognition";

const TARGET_SAMPLE_RATE = 20;
const SAMPLE_INTERVAL = 1000 / TARGET_SAMPLE_RATE;
const CHUNK_SIZE = 200;
const SENSOR_TIMEOUT = 0;

// ==========================================
// HTML ELEMENTS
// ==========================================

const startBtn = document.getElementById("startBtn");
const endBtn = document.getElementById("endBtn");
const timerDisplay = document.getElementById("timerDisplay");
const statusText = document.getElementById("statusText");
const uploadStatus = document.getElementById("uploadStatus");

// ==========================================
// FIREBASE INITIALIZATION
// ==========================================

let db = null;
let currentUser = null;
let firebaseReady = false;

async function initializeFirebase() {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    const auth = firebase.auth();
    db = firebase.firestore();

    const result = await auth.signInAnonymously();
    currentUser = result.user;

    firebaseReady = true;
    uploadStatus.textContent = "Firebase connected";
  } catch (error) {
    console.error("Firebase error:", error);
    uploadStatus.textContent = "Firebase connection failed";
  }
}

// ==========================================
// RECORDING STATE
// ==========================================

let isRecording = false;
let sessionRef = null;

let recordingStartTime = null;
let lastSampleTime = 0;

let timerInterval = null;
let sensorTimeout = null;

let sampleBuffer = [];
let totalSamples = 0;
let totalChunks = 0;

let uploadQueue = Promise.resolve();
let sensorMode = null;

// ==========================================
// HELPERS
// ==========================================

function setStatus(message) {
  statusText.textContent = message;
}

function setUploadStatus(message) {
  uploadStatus.textContent = message;
}

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0")
  ].join(":");
}

function updateTimer() {
  if (!recordingStartTime) return;

  timerDisplay.textContent = formatTime(
    Date.now() - recordingStartTime
  );
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

// ==========================================
// SENSOR PERMISSION
// ==========================================

async function requestSensorPermission() {
  if (!window.isSecureContext) {
    throw new Error(
      "Open this website using HTTPS on your phone."
    );
  }

  if (!("DeviceMotionEvent" in window)) {
    throw new Error(
      "This browser does not support motion sensors."
    );
  }

  if (
    typeof DeviceMotionEvent.requestPermission === "function"
  ) {
    const permission = await DeviceMotionEvent.requestPermission();

    if (permission !== "granted") {
      throw new Error("Motion sensor permission was denied.");
    }
  }
}

// ==========================================
// SENSOR DATA EXTRACTION
// ==========================================

function extractSensorData(event) {
  const acceleration = event.acceleration;
  const accelerationWithGravity = event.accelerationIncludingGravity;
  const rotation = event.rotationRate;

  let acc = acceleration;
  let mode = "linear_acceleration";

  // Use the actual device acceleration including gravity
  // only when linear acceleration is unavailable.
  if (
    !acc ||
    !isFiniteNumber(acc.x) ||
    !isFiniteNumber(acc.y) ||
    !isFiniteNumber(acc.z)
  ) {
    acc = accelerationWithGravity;
    mode = "acceleration_including_gravity";
  }

  if (
    !acc ||
    !rotation ||
    !isFiniteNumber(acc.x) ||
    !isFiniteNumber(acc.y) ||
    !isFiniteNumber(acc.z) ||
    !isFiniteNumber(rotation.alpha) ||
    !isFiniteNumber(rotation.beta) ||
    !isFiniteNumber(rotation.gamma)
  ) {
    return null;
  }

  // Browser rotationRate values are in degrees per second.
  // Convert them to radians per second.
  const degreesToRadians = Math.PI / 180;

  return {
    Ax: acc.x,
    Ay: acc.y,
    Az: acc.z,

    Gx: rotation.alpha * degreesToRadians,
    Gy: rotation.beta * degreesToRadians,
    Gz: rotation.gamma * degreesToRadians,

    timestamp: Date.now()
  };
}

// ==========================================
// FIREBASE CHUNK UPLOAD
// ==========================================

function uploadChunk(samples) {
  if (!sessionRef || samples.length === 0) {
    return Promise.resolve();
  }

  const chunkIndex = totalChunks;

  totalChunks++;

  const chunkData = {
    source: SOURCE_NAME,
    document_type: "sensor_chunk",
    session_id: sessionRef.id,
    session_document_id: sessionRef.id,
    user_id: currentUser.uid,

    activity: null,
    activity_label: null,

    chunk_index: chunkIndex,
    sample_count: samples.length,
    samples: samples,

    uploaded_at: firebase.firestore.FieldValue.serverTimestamp()
  };

  const uploadTask = uploadQueue.then(async () => {
    await db.collection(COLLECTION_NAME).add(chunkData);
  });

  uploadQueue = uploadTask;

  return uploadTask;
}

function addSampleToBuffer(sample) {
  sampleBuffer.push(sample);
  totalSamples++;

  if (sampleBuffer.length >= CHUNK_SIZE) {
    const chunk = sampleBuffer;
    sampleBuffer = [];

    return uploadChunk(chunk);
  }

  return Promise.resolve();
}

// ==========================================
// SENSOR EVENT HANDLER
// ==========================================

function handleDeviceMotion(event) {
  if (!isRecording) return;

  const now = Date.now();

  if (now - lastSampleTime < SAMPLE_INTERVAL) {
    return;
  }

  const sensorData = extractSensorData(event);

  if (!sensorData) {
    return;
  }

  lastSampleTime = now;

  if (!sensorMode) {
    sensorMode = sensorData.Ax !== null
      ? (
          event.acceleration &&
          isFiniteNumber(event.acceleration.x)
            ? "linear_acceleration"
            : "acceleration_including_gravity"
        )
      : "unknown";
  }

  clearTimeout(sensorTimeout);

  const uploadPromise = addSampleToBuffer(sensorData);

  uploadPromise
    .then(() => {
      setUploadStatus(
        "Recording • " + totalSamples + " samples collected"
      );
    })
    .catch(error => {
      console.error("Upload error:", error);
      setUploadStatus("Firebase upload failed. Sensor recording continues. " + error.message);
    });
}

// ==========================================
// START RECORDING
// ==========================================

async function startRecording() {
  if (isRecording) return;

  startBtn.disabled = true;
  setStatus("PREPARING...");
  setUploadStatus("Checking Firebase and sensor permissions...");

  try {
    if (!firebaseReady || !currentUser || !db) {
      throw new Error(
        "Firebase is not connected. Please reload the page."
      );
    }

    await requestSensorPermission();

    sampleBuffer = [];
    totalSamples = 0;
    totalChunks = 0;
    lastSampleTime = 0;
    sensorMode = null;
    uploadQueue = Promise.resolve();

    recordingStartTime = Date.now();

    // Create session metadata document.
    const metadata = {
      source: SOURCE_NAME,
      document_type: "session_metadata",

      user_id: currentUser.uid,
      activity: null,
      activity_label: null,

      sample_count: 0,
      total_chunks: 0,

      target_sample_rate_hz: TARGET_SAMPLE_RATE,
      achieved_sample_rate_hz: 0,

      duration_seconds: 0,
      sensor_mode: null,

      status: "recording",

      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      uploaded_at: firebase.firestore.FieldValue.serverTimestamp()
    };

    sessionRef = await db
      .collection(COLLECTION_NAME)
      .add(metadata);

    isRecording = true;

    startBtn.disabled = true;
    endBtn.disabled = false;

    setStatus("RECORDING");
    setUploadStatus("Recording and uploading sensor data...");

    window.addEventListener(
      "devicemotion",
      handleDeviceMotion,
      true
    );

    timerInterval = setInterval(updateTimer, 250);

  } catch (error) {
    console.error("Start recording error:", error);

    isRecording = false;
    startBtn.disabled = false;
    endBtn.disabled = true;

    setStatus("READY");
    setUploadStatus(error.message);
  }
}

// ==========================================
// END RECORDING
// ==========================================

async function stopRecording(sensorError = false) {
  if (!isRecording) return;

  isRecording = false;

  window.removeEventListener(
    "devicemotion",
    handleDeviceMotion,
    true
  );

  clearInterval(timerInterval);
  clearTimeout(sensorTimeout);

  startBtn.disabled = false;
  endBtn.disabled = true;

  setStatus("SAVING DATA");
  setUploadStatus("Uploading remaining sensor data...");

  try {
    // Upload the final incomplete chunk.
    if (sampleBuffer.length > 0) {
      const finalChunk = sampleBuffer;
      sampleBuffer = [];

      await uploadChunk(finalChunk);
    }

    // Wait until all queued uploads finish.
    await uploadQueue;

    const durationSeconds = recordingStartTime
      ? (Date.now() - recordingStartTime) / 1000
      : 0;

    const achievedRate = durationSeconds > 0
      ? totalSamples / durationSeconds
      : 0;

    if (sessionRef) {
      await sessionRef.update({
        sample_count: totalSamples,
        total_chunks: totalChunks,

        duration_seconds: durationSeconds,
        achieved_sample_rate_hz: achievedRate,

        sensor_mode: sensorMode,

        status: sensorError ? "sensor_error" : "completed",

        completed_at: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    updateTimer();

    setStatus(sensorError ? "SENSOR ERROR" : "COMPLETED");

    setUploadStatus(
      totalSamples + " samples saved to Firebase"
    );

  } catch (error) {
    console.error("Final upload error:", error);

    setStatus("UPLOAD ERROR");
    setUploadStatus(
      "Could not finish uploading: " + error.message
    );
  } finally {
    sessionRef = null;
    recordingStartTime = null;
  }
}

// ==========================================
// BUTTON EVENTS
// ==========================================

startBtn.addEventListener("click", startRecording);

endBtn.addEventListener("click", () => {
  stopRecording(false);
});

// ==========================================
// PAGE INITIALIZATION
// ==========================================

endBtn.disabled = true;
startBtn.disabled = false;

initializeFirebase();



