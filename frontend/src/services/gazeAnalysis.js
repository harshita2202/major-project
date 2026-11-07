export const GAZE_API_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/gaze-api`
  : (import.meta.env.VITE_GAZE_API_URL || 'http://localhost:5001');

// Landmark indices matching gaze_detection/landmarks.py
const LEFT_EYE_CONTOUR = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE_CONTOUR = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
const LEFT_IRIS_CENTER = 468;
const RIGHT_IRIS_CENTER = 473;
const NOSE_TIP = 1;
const CHIN = 152;
const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;

let pythonBackendAvailable = true;
let lastPythonRetryTime = 0;
const PYTHON_RETRY_INTERVAL_MS = 30000;

let mediaPipeLandmarker = null;
let mediaPipeLoadingPromise = null;

/**
 * Lazily loads MediaPipe FaceLandmarker in the browser using the local
 * /models/face_landmarker.task bundle so face, multi-face, head-pose, and
 * iris gaze detection work even when the Python server (port 5001) is offline.
 */
async function getBrowserFaceLandmarker() {
  if (mediaPipeLandmarker) return mediaPipeLandmarker;
  if (mediaPipeLoadingPromise) return mediaPipeLoadingPromise;

  mediaPipeLoadingPromise = (async () => {
    try {
      const visionModule = await import(
        /* @vite-ignore */
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm'
      );
      const { FaceLandmarker, FilesetResolver } = visionModule;
      const filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      mediaPipeLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: '/models/face_landmarker.task',
        },
        runningMode: 'IMAGE',
        numFaces: 3,
        minFaceDetectionConfidence: 0.45,
        minFacePresenceConfidence: 0.45,
      });
      return mediaPipeLandmarker;
    } catch (err) {
      console.warn('[GazeAnalysis] Browser MediaPipe load error:', err);
      mediaPipeLoadingPromise = null;
      return null;
    }
  })();

  return mediaPipeLoadingPromise;
}

/**
 * Analyzes 478 MediaPipe face landmarks in the browser to compute:
 * - face_detected & face_count (single, missing, or multiple faces)
 * - 3D head_pose (yaw, pitch, roll in degrees)
 * - iris-to-eye-contour gaze_direction (CENTER, LEFT, RIGHT, UP, DOWN)
 */
function evaluateLandmarksInBrowser(faceLandmarksList) {
  if (!faceLandmarksList || faceLandmarksList.length === 0) {
    return {
      face_detected: false,
      face_count: 0,
      gaze_direction: 'NO_FACE',
      pitch: null,
      yaw: null,
      head_pose: null,
      is_suspicious: true,
      suspicion_score: 0.8,
      message: 'No face detected in camera',
    };
  }

  // Compute bounding box area for each detected face and sort largest-first
  const facesWithArea = faceLandmarksList
    .map((lms) => {
      let minX = 1, maxX = 0, minY = 1, maxY = 0;
      for (const pt of lms) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
      const area = Math.max(0.0001, (maxX - minX) * (maxY - minY));
      return { lms, area };
    })
    .sort((a, b) => b.area - a.area);

  const primaryArea = facesWithArea[0].area;
  const validFaces = facesWithArea.filter((f) => f.area >= 0.18 * primaryArea);
  const faceCount = validFaces.length;

  if (faceCount > 1) {
    return {
      face_detected: true,
      face_count: faceCount,
      gaze_direction: 'MULTIPLE_FACES',
      pitch: 0,
      yaw: 0,
      head_pose: { yaw: 0, pitch: 0, roll: 0 },
      is_suspicious: true,
      suspicion_score: 0.9,
      message: `Multiple faces (${faceCount}) detected in camera`,
    };
  }

  const lms = validFaces[0].lms;

  // 1. Estimate Head Pose (yaw, pitch, roll) from key facial landmarks
  const nose = lms[NOSE_TIP];
  const chin = lms[CHIN];
  const leftEyeOuter = lms[LEFT_EYE_OUTER];
  const rightEyeOuter = lms[RIGHT_EYE_OUTER];

  const eyeMidX = (leftEyeOuter.x + rightEyeOuter.x) / 2;
  const eyeMidY = (leftEyeOuter.y + rightEyeOuter.y) / 2;
  const eyeSpanX = Math.max(0.05, Math.abs(rightEyeOuter.x - leftEyeOuter.x));
  const faceHeightY = Math.max(0.05, Math.abs(chin.y - eyeMidY));

  // Nose horizontal offset relative to eye midpoint -> head yaw (degrees)
  const headYaw = ((nose.x - eyeMidX) / (eyeSpanX * 0.5)) * 45;
  // Nose vertical ratio between eye line and chin (neutral ~ 0.36) -> head pitch (degrees)
  const noseRatioY = (nose.y - eyeMidY) / faceHeightY;
  const headPitch = (noseRatioY - 0.36) * 110;
  const headRoll =
    Math.atan2(rightEyeOuter.y - leftEyeOuter.y, rightEyeOuter.x - leftEyeOuter.x) *
    (180 / Math.PI);

  // 2. Estimate Iris Position inside Left & Right Eye Contours
  let avgRx = 0.5;
  let avgRy = 0.5;

  if (lms.length >= 478) {
    const computeEyeRatio = (contourIndices, irisIdx) => {
      let minX = 1, maxX = 0, minY = 1, maxY = 0;
      for (const idx of contourIndices) {
        const p = lms[idx];
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
      const w = Math.max(0.005, maxX - minX);
      const h = Math.max(0.003, maxY - minY);
      const iris = lms[irisIdx];
      return {
        rx: (iris.x - minX) / w,
        ry: (iris.y - minY) / h,
      };
    };

    const leftRatio = computeEyeRatio(LEFT_EYE_CONTOUR, LEFT_IRIS_CENTER);
    const rightRatio = computeEyeRatio(RIGHT_EYE_CONTOUR, RIGHT_IRIS_CENTER);
    avgRx = (leftRatio.rx + rightRatio.rx) / 2;
    avgRy = (leftRatio.ry + rightRatio.ry) / 2;
  }

  // Combine iris ratio and head pose into gaze yaw/pitch degrees
  const irisYawDeg = (avgRx - 0.5) * 95;
  const irisPitchDeg = (0.5 - avgRy) * 80; // negative = looking down

  const combinedYaw = headYaw * 0.65 + irisYawDeg * 0.55;
  const combinedPitch = -headPitch * 0.65 + irisPitchDeg * 0.45;

  let direction = 'CENTER';
  if (combinedYaw > 22 || headYaw > 26 || avgRx < 0.34) {
    direction = 'RIGHT';
  } else if (combinedYaw < -22 || headYaw < -26 || avgRx > 0.66) {
    direction = 'LEFT';
  } else if (headPitch > 24 || combinedPitch < -36) {
    direction = 'DOWN';
  } else if (headPitch < -20 || combinedPitch > 20) {
    direction = 'UP';
  }

  const isSuspicious = direction !== 'CENTER' || Math.abs(headYaw) > 26 || Math.abs(headPitch) > 24;

  return {
    face_detected: true,
    face_count: 1,
    gaze_direction: direction,
    pitch: combinedPitch,
    yaw: combinedYaw,
    head_pose: {
      yaw: headYaw,
      pitch: headPitch,
      roll: headRoll,
    },
    is_suspicious: isSuspicious,
    suspicion_score: isSuspicious ? 0.75 : 0.0,
    message: isSuspicious ? `Suspicious: Looking ${direction}` : 'Normal',
  };
}

export const analyzeGazeFrame = async (base64ImageData, sessionId = 'default', canvasElement = null) => {
  const now = Date.now();

  // 1. Try Python Gaze API if available (or periodically retry every 30s)
  if (pythonBackendAvailable || now - lastPythonRetryTime > PYTHON_RETRY_INTERVAL_MS) {
    lastPythonRetryTime = now;
    try {
      const base64Data = base64ImageData.replace(/^data:image\/jpeg;base64,/, '');
      const response = await fetch(`${GAZE_API_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data,
          session_id: sessionId || 'default',
        }),
      });

      if (response.ok) {
        pythonBackendAvailable = true;
        return await response.json();
      }
      pythonBackendAvailable = false;
    } catch {
      pythonBackendAvailable = false;
    }
  }

  // 2. Fallback to In-Browser MediaPipe FaceLandmarker (478 landmarks + iris + multi-face)
  try {
    const landmarker = await getBrowserFaceLandmarker();
    if (landmarker && canvasElement) {
      const results = landmarker.detect(canvasElement);
      return evaluateLandmarksInBrowser(results?.faceLandmarks || []);
    }
  } catch (err) {
    console.warn('[GazeAnalysis] Browser landmark detection notice:', err);
  }

  return null;
};

export const checkGazeHealth = async () => {
  try {
    const response = await fetch(`${GAZE_API_URL}/health`);
    if (!response.ok) {
      return { status: 'browser-fallback', model: 'mediapipe-wasm' };
    }
    return await response.json();
  } catch {
    return { status: 'browser-fallback', model: 'mediapipe-wasm' };
  }
};
