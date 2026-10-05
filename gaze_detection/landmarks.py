"""
landmarks.py — Face and iris landmark detection via MediaPipe FaceLandmarker.

Uses the MediaPipe Tasks API (mp.tasks.vision.FaceLandmarker) with the
``face_landmarker.task`` model bundle, which produces 478 landmarks per
face (468 face mesh + 10 iris points).

This module does NOT contain any gaze-estimation logic.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

# ------------------------------------------------------------------ #
#  Landmark index constants
# ------------------------------------------------------------------ #

# Left eye contour (16 points forming the eye outline)
LEFT_EYE_CONTOUR = [
    33, 7, 163, 144, 145, 153, 154, 155,
    133, 173, 157, 158, 159, 160, 161, 246,
]

# Right eye contour
RIGHT_EYE_CONTOUR = [
    362, 382, 381, 380, 374, 373, 390, 249,
    263, 466, 388, 387, 386, 385, 384, 398,
]

# Iris landmarks (produced by the face_landmarker model)
LEFT_IRIS = [468, 469, 470, 471, 472]   # 468 = center
RIGHT_IRIS = [473, 474, 475, 476, 477]  # 473 = center

LEFT_IRIS_CENTER = 468
RIGHT_IRIS_CENTER = 473

# Key facial landmarks for head-pose estimation (solvePnP)
NOSE_TIP = 1
CHIN = 152
LEFT_EYE_LEFT_CORNER = 33
RIGHT_EYE_RIGHT_CORNER = 263
LEFT_MOUTH_CORNER = 61
RIGHT_MOUTH_CORNER = 291

# Indices used by head_pose.py
HEAD_POSE_LANDMARKS = [
    NOSE_TIP,
    CHIN,
    LEFT_EYE_LEFT_CORNER,
    RIGHT_EYE_RIGHT_CORNER,
    LEFT_MOUTH_CORNER,
    RIGHT_MOUTH_CORNER,
]

# Default path to the face_landmarker.task model bundle.
_DEFAULT_MODEL_PATH = Path(__file__).parent / "models" / "face_landmarker.task"


# ------------------------------------------------------------------ #
#  Data structures
# ------------------------------------------------------------------ #

@dataclass
class FaceData:
    """All landmark data for a single detected face.

    Coordinates in ``landmarks`` are *normalized* (0–1) as returned by
    MediaPipe.  Pixel-space coordinates are in ``landmarks_px``.
    """

    # All 478 landmarks as (x, y, z) normalized coords
    landmarks: List[Tuple[float, float, float]]

    # Same landmarks converted to pixel coordinates (x_px, y_px)
    landmarks_px: List[Tuple[int, int]]

    # Face bounding box in pixels: (x, y, w, h)
    bbox: Tuple[int, int, int, int]

    # Subsets for convenience ------------------------------------------------

    left_eye_contour_px: List[Tuple[int, int]] = field(default_factory=list)
    right_eye_contour_px: List[Tuple[int, int]] = field(default_factory=list)

    left_iris_px: List[Tuple[int, int]] = field(default_factory=list)
    right_iris_px: List[Tuple[int, int]] = field(default_factory=list)

    left_iris_center_px: Tuple[int, int] = (0, 0)
    right_iris_center_px: Tuple[int, int] = (0, 0)


# ------------------------------------------------------------------ #
#  Detector
# ------------------------------------------------------------------ #

class FaceLandmarkDetector:
    """Detects faces and their 478-point landmarks using the MediaPipe
    FaceLandmarker Task API.

    Requires the ``face_landmarker.task`` model bundle (downloaded
    separately — see README).

    Usage::

        detector = FaceLandmarkDetector(max_faces=1)
        faces = detector.detect(bgr_frame)
        if faces:
            biggest = faces[0]   # sorted largest-first
    """

    def __init__(
        self,
        max_faces: int = 5,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
        model_path: Optional[str | Path] = None,
    ) -> None:
        if model_path is None:
            model_path = _DEFAULT_MODEL_PATH
        model_path = Path(model_path)

        if not model_path.is_file():
            raise FileNotFoundError(
                f"FaceLandmarker model not found at {model_path}. "
                "Download from: https://storage.googleapis.com/mediapipe-models/"
                "face_landmarker/face_landmarker/float16/1/face_landmarker.task"
            )

        self._max_faces = max_faces

        # Configure FaceLandmarker with VIDEO running mode (requires
        # monotonically increasing timestamps).
        base_options = mp_python.BaseOptions(
            model_asset_path=str(model_path),
        )
        options = mp_vision.FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=mp_vision.RunningMode.VIDEO,
            num_faces=max_faces,
            min_face_detection_confidence=min_detection_confidence,
            min_face_presence_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False,
        )
        self._landmarker = mp_vision.FaceLandmarker.create_from_options(options)
        self._frame_count = 0

    # ------------------------------------------------------------------ #
    #  Detection
    # ------------------------------------------------------------------ #

    def detect(self, frame: np.ndarray) -> List[FaceData]:
        """Detect faces in a BGR frame.

        Args:
            frame: OpenCV BGR image (H×W×3, uint8).

        Returns:
            List of ``FaceData`` sorted by bounding-box area descending
            (largest face first). Empty list when no face is found.
        """
        h, w = frame.shape[:2]

        # MediaPipe expects RGB input.
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        # VIDEO mode requires monotonically increasing timestamps (ms).
        self._frame_count += 1
        timestamp_ms = int(time.time() * 1000)
        # Ensure monotonicity by using frame_count as a fallback floor.
        timestamp_ms = max(timestamp_ms, self._frame_count)

        results = self._landmarker.detect_for_video(mp_image, timestamp_ms)

        if not results.face_landmarks:
            return []

        faces: List[FaceData] = []
        for face_lms in results.face_landmarks:
            face = self._build_face_data(face_lms, w, h)
            faces.append(face)

        # Sort by bounding-box area (largest first).
        faces.sort(key=lambda f: f.bbox[2] * f.bbox[3], reverse=True)
        return faces

    # ------------------------------------------------------------------ #
    #  Internal helpers
    # ------------------------------------------------------------------ #

    def _build_face_data(
        self,
        face_lms: list,  # list of mediapipe NormalizedLandmark
        img_w: int,
        img_h: int,
    ) -> FaceData:
        """Convert raw MediaPipe landmarks into a ``FaceData`` object."""

        # Collect all landmarks ------------------------------------------
        landmarks = []
        landmarks_px = []
        xs, ys = [], []

        for lm in face_lms:
            landmarks.append((lm.x, lm.y, lm.z))
            px = int(lm.x * img_w)
            py = int(lm.y * img_h)
            landmarks_px.append((px, py))
            xs.append(px)
            ys.append(py)

        # Bounding box from all landmark positions -----------------------
        x_min, x_max = min(xs), max(xs)
        y_min, y_max = min(ys), max(ys)
        bbox = (x_min, y_min, x_max - x_min, y_max - y_min)

        # Eye contour subsets --------------------------------------------
        left_eye_contour = [landmarks_px[i] for i in LEFT_EYE_CONTOUR]
        right_eye_contour = [landmarks_px[i] for i in RIGHT_EYE_CONTOUR]

        # Iris subsets (the face_landmarker model always returns 478 points).
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

    # ------------------------------------------------------------------ #
    #  Visualisation (debug)
    # ------------------------------------------------------------------ #

    def draw_landmarks(
        self,
        frame: np.ndarray,
        face: FaceData,
        draw_contour: bool = True,
        draw_iris: bool = True,
        draw_bbox: bool = True,
    ) -> np.ndarray:
        """Draw face landmarks, iris, and bounding box on *frame* (in-place).

        Args:
            frame: BGR image to draw on.
            face:  ``FaceData`` for one face.
            draw_contour: Draw eye contour points.
            draw_iris:    Draw iris landmarks.
            draw_bbox:    Draw face bounding box.

        Returns:
            The same *frame* reference (drawn in-place).
        """
        # Face bounding box -----------------------------------------------
        if draw_bbox:
            x, y, w, h = face.bbox
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 1)

        # Eye contours -----------------------------------------------------
        if draw_contour:
            for pt in face.left_eye_contour_px:
                cv2.circle(frame, pt, 1, (0, 255, 255), -1)
            for pt in face.right_eye_contour_px:
                cv2.circle(frame, pt, 1, (0, 255, 255), -1)

        # Iris landmarks ---------------------------------------------------
        if draw_iris and face.left_iris_px:
            for pt in face.left_iris_px:
                cv2.circle(frame, pt, 1, (255, 0, 255), -1)
            cv2.circle(frame, face.left_iris_center_px, 2, (0, 0, 255), -1)

            for pt in face.right_iris_px:
                cv2.circle(frame, pt, 1, (255, 0, 255), -1)
            cv2.circle(frame, face.right_iris_center_px, 2, (0, 0, 255), -1)

        return frame

    # ------------------------------------------------------------------ #
    #  Cleanup
    # ------------------------------------------------------------------ #

    def close(self) -> None:
        """Release MediaPipe resources."""
        self._landmarker.close()
