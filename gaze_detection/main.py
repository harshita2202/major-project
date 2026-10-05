"""
main.py — Pipeline coordinator for the real-time gaze detection system.

Integrates all modules:
  Webcam → Face Landmarks → Eye Crops → Head Pose →
  L2CS-Net (or geometric fallback) → Calibration →
  Smoothing → Visualisation

Controls:
  q     — Quit
  c     — Run calibration
  r     — Reset smoother
  g     — Toggle gaze dot window
  f     — Toggle geometric fallback (force)
"""

from __future__ import annotations

import sys
from typing import Optional, Tuple

import cv2
import numpy as np

from capture import VideoCapture
from landmarks import FaceLandmarkDetector, FaceData
from eye_crop import extract_eye_regions, GeometricGazeEstimator, GazeDirection
from head_pose import estimate_head_pose, draw_head_pose_axes, HeadPose
from smoothing import GazeSmoother
from visualization import (
    draw_eye_bboxes,
    draw_hud,
    draw_no_face,
    draw_eye_crops_inset,
    draw_gaze_arrow,
)

# Optional imports (graceful degradation) --------------------------------
try:
    from gaze_model import GazePredictor, GazeResult
    _HAS_GAZE_MODEL = True
except (ImportError, Exception) as e:
    _HAS_GAZE_MODEL = False
    print(f"[main] L2CS-Net unavailable ({e}). Using geometric fallback.")

try:
    from calibration import ScreenCalibrator, ScreenMapper, DEFAULT_CALIBRATION_PATH
    _HAS_CALIBRATION = True
except ImportError:
    _HAS_CALIBRATION = False

# ------------------------------------------------------------------ #
#  Configuration
# ------------------------------------------------------------------ #

CAMERA_INDEX = 0
FRAME_WIDTH = 640
FRAME_HEIGHT = 480

WINDOW_NAME = "Gaze Detection"
GAZE_DOT_WINDOW = "Gaze Point"

SMOOTHER_ALPHA = 0.3


# ------------------------------------------------------------------ #
#  Gaze callback for calibration
# ------------------------------------------------------------------ #

def _make_gaze_callback(detector, predictor, geo_gaze):
    """Return a callable(frame) -> (pitch, yaw) | None for calibration."""

    def callback(frame):
        faces = detector.detect(frame)
        if not faces:
            return None
        face = faces[0]

        if predictor is not None:
            result = predictor.predict(frame, face)
            if result is not None:
                return (result.pitch, result.yaw)

        # Geometric fallback cannot produce meaningful pitch/yaw for
        # calibration, so return None.
        return None

    return callback


# ------------------------------------------------------------------ #
#  Main loop
# ------------------------------------------------------------------ #

def main() -> None:
    """Run the full gaze detection pipeline."""

    # ---- Initialise modules -------------------------------------------
    print("[main] Initialising modules …", flush=True)
    detector = FaceLandmarkDetector(max_faces=5)
    geo_gaze = GeometricGazeEstimator()
    smoother = GazeSmoother(alpha=SMOOTHER_ALPHA)

    # L2CS-Net (optional) -----------------------------------------------
    predictor: Optional[GazePredictor] = None  # type: ignore[name-defined]
    if _HAS_GAZE_MODEL:
        try:
            predictor = GazePredictor()  # type: ignore[name-defined]
        except Exception as e:
            print(f"[main] Failed to load L2CS-Net: {e}")
            print("[main] Falling back to geometric estimator.")

    force_geometric = predictor is None  # start in fallback if no model

    # Calibration (optional) --------------------------------------------
    mapper: Optional[ScreenMapper] = None  # type: ignore[name-defined]
    if _HAS_CALIBRATION:
        try:
            mapper = ScreenMapper.load()  # type: ignore[name-defined]
            print(f"[main] Loaded calibration from {DEFAULT_CALIBRATION_PATH}")
        except (FileNotFoundError, ValueError) as e:
            print(f"[main] No calibration loaded ({e}). Press 'c' to calibrate.")

    # Camera -------------------------------------------------------------
    try:
        cap = VideoCapture(
            camera_index=CAMERA_INDEX,
            width=FRAME_WIDTH,
            height=FRAME_HEIGHT,
        )
        cap.open()
    except RuntimeError as e:
        print(f"[main] FATAL: {e}", flush=True)
        sys.exit(1)

    # Create the display window early so the user sees something immediately.
    cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_AUTOSIZE)

    show_gaze_dot = False
    print("[main] Pipeline running. Press 'q' to quit, 'c' to calibrate.",
          flush=True)

    try:
        while True:
            # 1. Capture --------------------------------------------------
            ok, frame, fps = cap.read()
            if not ok or frame is None:
                print("[main] Failed to read frame – exiting.")
                break

            # 2. Detect face + landmarks ----------------------------------
            faces = detector.detect(frame)
            face_detected = len(faces) > 0

            gaze_label = ""
            pitch: Optional[float] = None
            yaw: Optional[float] = None
            head_pose_val: Optional[HeadPose] = None
            screen_point: Optional[Tuple[int, int]] = None

            if face_detected:
                face = faces[0]  # largest face

                # 3. Draw landmarks ----------------------------------------
                detector.draw_landmarks(frame, face)

                # 4. Extract eye regions -----------------------------------
                eye_data = extract_eye_regions(frame, face)
                draw_eye_bboxes(frame, eye_data.left_bbox, eye_data.right_bbox)

                # 5. Head pose ---------------------------------------------
                head_pose_val = estimate_head_pose(frame, face)
                if head_pose_val is not None:
                    draw_head_pose_axes(frame, face, head_pose_val)

                # 6. Gaze estimation ----------------------------------------
                if predictor is not None and not force_geometric:
                    result = predictor.predict(frame, face)
                    if result is not None:
                        pitch = result.pitch
                        yaw = result.yaw
                        gaze_label = _angle_to_label(pitch, yaw)

                        # Draw gaze arrow at nose tip
                        nose = face.landmarks_px[1]  # NOSE_TIP
                        draw_gaze_arrow(frame, nose, pitch, yaw)
                    else:
                        gaze_label = "INFERENCE FAILED"
                else:
                    gaze_dir = geo_gaze.estimate(face)
                    gaze_label = gaze_dir.value + " (geo)"

                # 7. Screen mapping -----------------------------------------
                if mapper is not None and pitch is not None and yaw is not None:
                    raw_point = mapper.map(pitch, yaw)
                    sp = smoother.update(float(raw_point[0]),
                                         float(raw_point[1]))
                    screen_point = (int(sp.x), int(sp.y))

                # 8. Eye crop insets ----------------------------------------
                draw_eye_crops_inset(
                    frame, eye_data.left_eye_img, eye_data.right_eye_img
                )

                # 9. HUD ----------------------------------------------------
                draw_hud(
                    frame,
                    fps=fps,
                    face_detected=True,
                    gaze_label=gaze_label,
                    pitch=pitch,
                    yaw=yaw,
                    screen_point=screen_point,
                    head_pose=(head_pose_val.yaw, head_pose_val.pitch,
                               head_pose_val.roll) if head_pose_val else None,
                )
            else:
                draw_no_face(frame)
                draw_hud(frame, fps=fps, face_detected=False)
                smoother.reset()

            # 10. Display --------------------------------------------------
            cv2.imshow(WINDOW_NAME, frame)

            # Gaze dot window (optional fullscreen overlay)
            if show_gaze_dot and screen_point is not None:
                _draw_gaze_dot_window(screen_point)

            # 11. Key handling --------------------------------------------
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            elif key == ord("c"):
                if not _HAS_CALIBRATION:
                    print("[main] Calibration unavailable (scikit-learn "
                          "not installed).", flush=True)
                elif predictor is None:
                    print("[main] Cannot calibrate without L2CS-Net model. "
                          "Check model loading errors above.", flush=True)
                else:
                    print("[main] Starting calibration...", flush=True)
                    cb = _make_gaze_callback(detector, predictor, geo_gaze)
                    calibrator = ScreenCalibrator()  # type: ignore[name-defined]
                    new_mapper = calibrator.calibrate(cap, cb)
                    if new_mapper is not None:
                        new_mapper.save()
                        mapper = new_mapper
                        smoother.reset()
                        print("[main] Calibration saved!", flush=True)
                    else:
                        print("[main] Calibration failed or cancelled.",
                              flush=True)
            elif key == ord("r"):
                smoother.reset()
                print("[main] Smoother reset.", flush=True)
            elif key == ord("g"):
                show_gaze_dot = not show_gaze_dot
                if not show_gaze_dot:
                    cv2.destroyWindow(GAZE_DOT_WINDOW)
                print(f"[main] Gaze dot window: "
                      f"{'ON' if show_gaze_dot else 'OFF'}", flush=True)
            elif key == ord("f"):
                force_geometric = not force_geometric
                print(f"[main] Force geometric: {force_geometric}",
                      flush=True)

    except KeyboardInterrupt:
        print("\n[main] Interrupted.")

    finally:
        cap.release()
        detector.close()
        cv2.destroyAllWindows()
        print("[main] Shutdown complete.")


# ------------------------------------------------------------------ #
#  Helpers
# ------------------------------------------------------------------ #

def _angle_to_label(pitch: float, yaw: float) -> str:
    """Convert pitch/yaw radians to a coarse direction label."""
    import math
    p_deg = math.degrees(pitch)
    y_deg = math.degrees(yaw)

    h = ""
    if y_deg < -15:
        h = "LEFT"
    elif y_deg > 15:
        h = "RIGHT"

    v = ""
    if p_deg < -10:
        v = "UP"
    elif p_deg > 10:
        v = "DOWN"

    if h and v:
        return f"{v}-{h}"
    return h or v or "CENTER"


def _draw_gaze_dot_window(screen_point: Tuple[int, int]) -> None:
    """Show a fullscreen window with a dot at the estimated gaze position."""
    try:
        from calibration import get_screen_size
        sw, sh = get_screen_size()
    except Exception:
        sw, sh = 1920, 1080

    canvas = np.zeros((sh, sw, 3), dtype=np.uint8)
    cx, cy = screen_point
    cx = max(0, min(sw - 1, cx))
    cy = max(0, min(sh - 1, cy))

    cv2.circle(canvas, (cx, cy), 15, (0, 255, 0), -1)
    cv2.circle(canvas, (cx, cy), 18, (255, 255, 255), 2)

    cv2.namedWindow(GAZE_DOT_WINDOW, cv2.WINDOW_NORMAL)
    cv2.setWindowProperty(GAZE_DOT_WINDOW, cv2.WND_PROP_FULLSCREEN,
                          cv2.WINDOW_FULLSCREEN)
    cv2.imshow(GAZE_DOT_WINDOW, canvas)


if __name__ == "__main__":
    main()
