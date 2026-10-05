import sys
from pathlib import Path
import base64
import cv2
import numpy as np
import threading
import math
from typing import Optional
from pydantic import BaseModel
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

sys.path.append(str(Path(__file__).parent))

import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

from landmarks import (
    FaceData,
    LEFT_EYE_CONTOUR, RIGHT_EYE_CONTOUR,
    LEFT_IRIS, RIGHT_IRIS,
    LEFT_IRIS_CENTER, RIGHT_IRIS_CENTER
)
from gaze_model import GazePredictor
from head_pose import estimate_head_pose
from eye_crop import GeometricGazeEstimator, GazeDirection

class ImageFaceLandmarkDetector:
    def __init__(self, max_faces=1, model_path=None):
        if model_path is None:
            model_path = Path(__file__).parent / 'models' / 'face_landmarker.task'
        base_options = mp_python.BaseOptions(model_asset_path=str(model_path))
        options = mp_vision.FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=mp_vision.RunningMode.IMAGE,
            num_faces=max_faces,
            min_face_detection_confidence=0.5,
            min_face_presence_confidence=0.5,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
        )
        self._landmarker = mp_vision.FaceLandmarker.create_from_options(options)

    def detect(self, frame: np.ndarray) -> list[FaceData]:
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        results = self._landmarker.detect(mp_image)
        if not results.face_landmarks:
            return []

        faces = []
        for face_lms in results.face_landmarks:
            faces.append(self._build_face_data(face_lms, w, h))
        faces.sort(key=lambda f: f.bbox[2] * f.bbox[3], reverse=True)
        return faces

    def _build_face_data(self, face_lms, img_w, img_h) -> FaceData:
        landmarks = []
        landmarks_px = []
        xs, ys = [] , []

        for lm in face_lms:
            landmarks.append((lm.x, lm.y, lm.z))
            px = int(lm.x * img_w)
            py = int(lm.y * img_h)
            landmarks_px.append((px, py))
            xs.append(px)
            ys.append(py)

        x_min, x_max = min(xs), max(xs)
        y_min, y_max = min(ys), max(ys)
        bbox = (x_min, y_min, x_max - x_min, y_max - y_min)

        left_eye_contour = [landmarks_px[i] for i in LEFT_EYE_CONTOUR]
        right_eye_contour = [landmarks_px[i] for i in RIGHT_EYE_CONTOUR]

        has_iris = len(landmarks) >= 478
        if has_iris:
            left_iris = [landmarks_px[i] for i in LEFT_IRIS]
            right_iris = [landmarks_px[i] for i in RIGHT_IRIS]
            left_iris_center = landmarks_px[LEFT_IRIS_CENTER]
            right_iris_center = landmarks_px[RIGHT_IRIS_CENTER]
        else:
            left_iris = []
            right_iris = []
            left_iris_center = (0, 0)
            right_iris_center = (0, 0)

        return FaceData(
            landmarks=landmarks,
            landmarks_px=landmarks_px,
            bbox=bbox,
            left_eye_contour_px=left_eye_contour,
            right_eye_contour_px=right_eye_contour,
            left_iris_px=left_iris,
            right_iris_px=right_iris,
            left_iris_center_px=left_iris_center,
            right_iris_center_px=right_iris_center,
        )

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    image: str

detector = None
gaze_predictor = None
geometric_estimator = None
model_type = "none"
model_lock = threading.Lock()

consecutive_non_center = 0

@app.on_event("startup")
def startup_event():
    global detector, gaze_predictor, geometric_estimator, model_type
    print("Loading models...")
    detector = ImageFaceLandmarkDetector()
    geometric_estimator = GeometricGazeEstimator()
    try:
        gaze_predictor = GazePredictor()
        model_type = "l2cs"
        print("L2CS-Net loaded successfully.")
    except Exception as e:
        print(f"Failed to load L2CS-Net, falling back to geometric: {e}")
        model_type = "geometric"
        gaze_predictor = None

@app.get("/health")
def health():
    return {"status": "ok", "model": model_type}

def get_l2cs_direction(yaw_rad: float, pitch_rad: float) -> str:
    yaw_deg = math.degrees(yaw_rad)
    pitch_deg = math.degrees(pitch_rad)

    horizontal = "CENTER"
    if yaw_deg > 15:
        horizontal = "RIGHT"
    elif yaw_deg < -15:
        horizontal = "LEFT"

    vertical = ""
    if pitch_deg > 15:
        vertical = "DOWN"
    elif pitch_deg < -15:
        vertical = "UP"

    if vertical and horizontal != "CENTER":
        return f"{vertical}-{horizontal}"
    elif vertical:
        return vertical
    else:
        return horizontal

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    global consecutive_non_center

    base64_data = req.image
    if "," in base64_data:
        base64_data = base64_data.split(",")[1]

    try:
        img_data = base64.b64decode(base64_data)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"error": "Could not decode image"}
    except Exception as e:
        return {"error": f"Invalid base64 image: {e}"}

    with model_lock:
        faces = detector.detect(frame)

        if not faces:
            consecutive_non_center = 0
            return {
                "face_detected": False,
                "gaze_direction": "CENTER",
                "pitch": None,
                "yaw": None,
                "head_pose": None,
                "is_suspicious": False,
                "suspicion_score": 0.0,
                "message": "No face detected"
            }

        face = faces[0]

        # Head pose
        head_pose = estimate_head_pose(frame, face)
        hp_dict = None
        if head_pose:
            hp_dict = {
                "yaw": head_pose.yaw,
                "pitch": head_pose.pitch,
                "roll": head_pose.roll
            }

        # Gaze direction
        pitch_val = None
        yaw_val = None
        direction = "CENTER"

        if gaze_predictor:
            res = gaze_predictor.predict(frame, face)
            if res:
                pitch_val = math.degrees(res.pitch)
                yaw_val = math.degrees(res.yaw)
                direction = get_l2cs_direction(res.yaw, res.pitch)
        else:
            gaze_dir = geometric_estimator.estimate(face)
            direction = gaze_dir.value

        suspicious_head = False
        if head_pose:
            if abs(head_pose.yaw) > 30 or abs(head_pose.pitch) > 25:
                suspicious_head = True

        if direction != "CENTER":
            consecutive_non_center += 1
        else:
            if not suspicious_head:
                consecutive_non_center = 0

        is_suspicious = False
        suspicion_score = min(1.0, consecutive_non_center / 10.0)

        if consecutive_non_center >= 5 or suspicious_head:
            is_suspicious = True

        msg = "Normal"
        if not is_suspicious:
            pass
        elif suspicious_head:
            msg = "Suspicious: Head turned away"
        else:
            msg = "Suspicious: Looking away"

        return {
            "face_detected": True,
            "gaze_direction": direction,
            "pitch": pitch_val,
            "yaw": yaw_val,
            "head_pose": hp_dict,
            "is_suspicious": is_suspicious,
            "suspicion_score": suspicion_score,
            "message": msg
        }

if __name__ == '__main__':
    uvicorn.run("server:app", host="0.0.0.0", port=5001, reload=False)
