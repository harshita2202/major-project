"""
visualization.py — Drawing overlays for the gaze detection pipeline.

Provides functions to draw landmarks, eye bounding boxes, gaze info,
head-pose info, and HUD text onto the webcam frame.

This module is presentation-only — no detection or estimation logic.
"""

from __future__ import annotations

from typing import Optional, Tuple

import cv2
import numpy as np


# ------------------------------------------------------------------ #
#  Colours (BGR)
# ------------------------------------------------------------------ #

GREEN = (0, 255, 0)
YELLOW = (0, 255, 255)
MAGENTA = (255, 0, 255)
RED = (0, 0, 255)
CYAN = (255, 255, 0)
WHITE = (255, 255, 255)
ORANGE = (0, 165, 255)


# ------------------------------------------------------------------ #
#  Drawing helpers
# ------------------------------------------------------------------ #

def draw_eye_bboxes(
    frame: np.ndarray,
    left_bbox: Tuple[int, int, int, int],
    right_bbox: Tuple[int, int, int, int],
    color: Tuple[int, int, int] = CYAN,
    thickness: int = 1,
) -> None:
    """Draw rectangles around both eyes (in-place)."""
    for (x, y, w, h) in [left_bbox, right_bbox]:
        if w > 0 and h > 0:
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, thickness)


def draw_hud(
    frame: np.ndarray,
    fps: float,
    face_detected: bool,
    gaze_label: str = "",
    pitch: Optional[float] = None,
    yaw: Optional[float] = None,
    screen_point: Optional[Tuple[int, int]] = None,
    head_pose: Optional[Tuple[float, float, float]] = None,
) -> None:
    """Draw heads-up-display text in the top-left corner (in-place).

    Example output::

        FPS: 28
        Face: DETECTED
        Gaze: CENTER
        Pitch: 0.12
        Yaw: -0.08
        Screen: (820, 430)
    """
    lines = [f"FPS: {fps:.0f}"]
    lines.append(f"Face: {'DETECTED' if face_detected else 'NOT DETECTED'}")

    if gaze_label:
        lines.append(f"Gaze: {gaze_label}")

    if pitch is not None and yaw is not None:
        lines.append(f"Pitch: {pitch:+.2f}")
        lines.append(f"Yaw:   {yaw:+.2f}")

    if head_pose is not None:
        hp_yaw, hp_pitch, hp_roll = head_pose
        lines.append(f"Head Yaw:   {hp_yaw:+.1f}")
        lines.append(f"Head Pitch: {hp_pitch:+.1f}")
        lines.append(f"Head Roll:  {hp_roll:+.1f}")

    if screen_point is not None:
        lines.append(f"Screen: ({screen_point[0]}, {screen_point[1]})")

    y0 = 25
    for i, line in enumerate(lines):
        y = y0 + i * 22
        # Shadow for readability
        cv2.putText(frame, line, (11, y + 1), cv2.FONT_HERSHEY_SIMPLEX,
                    0.55, (0, 0, 0), 2, cv2.LINE_AA)
        cv2.putText(frame, line, (10, y), cv2.FONT_HERSHEY_SIMPLEX,
                    0.55, WHITE, 1, cv2.LINE_AA)


def draw_no_face(frame: np.ndarray) -> None:
    """Draw a prominent 'FACE NOT DETECTED' label (in-place)."""
    h, w = frame.shape[:2]
    text = "FACE NOT DETECTED"
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.9
    thickness = 2
    (tw, th), _ = cv2.getTextSize(text, font, scale, thickness)
    x = (w - tw) // 2
    y = (h + th) // 2
    cv2.putText(frame, text, (x + 2, y + 2), font, scale, (0, 0, 0),
                thickness + 1, cv2.LINE_AA)
    cv2.putText(frame, text, (x, y), font, scale, RED, thickness,
                cv2.LINE_AA)


def draw_eye_crops_inset(
    frame: np.ndarray,
    left_eye_img: Optional[np.ndarray],
    right_eye_img: Optional[np.ndarray],
    scale: float = 2.0,
) -> None:
    """Draw magnified eye crops in the bottom-right corner (in-place)."""
    h, w = frame.shape[:2]
    margin = 10
    y_offset = h - margin

    for img in [right_eye_img, left_eye_img]:
        if img is None:
            continue
        ih, iw = img.shape[:2]
        disp_w = int(iw * scale)
        disp_h = int(ih * scale)
        resized = cv2.resize(img, (disp_w, disp_h), interpolation=cv2.INTER_NEAREST)

        y1 = y_offset - disp_h
        x1 = w - margin - disp_w

        if y1 < 0 or x1 < 0:
            continue

        frame[y1:y1 + disp_h, x1:x1 + disp_w] = resized
        cv2.rectangle(frame, (x1, y1), (x1 + disp_w, y1 + disp_h), CYAN, 1)
        y_offset = y1 - 5  # stack upward


def draw_gaze_arrow(
    frame: np.ndarray,
    origin: Tuple[int, int],
    pitch: float,
    yaw: float,
    length: int = 100,
    color: Tuple[int, int, int] = GREEN,
    thickness: int = 2,
) -> None:
    """Draw a 2-D arrow representing gaze direction projected onto the image.

    Args:
        origin: (x, y) starting point (e.g. nose tip or face centre).
        pitch:  Gaze pitch in radians (positive = looking down).
        yaw:    Gaze yaw in radians (positive = looking right).
        length: Arrow length in pixels.
    """
    import math

    dx = int(-length * math.sin(yaw))
    dy = int(-length * math.sin(pitch))
    end = (origin[0] + dx, origin[1] + dy)
    cv2.arrowedLine(frame, origin, end, color, thickness, tipLength=0.3)
