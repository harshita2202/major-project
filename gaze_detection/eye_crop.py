"""
eye_crop.py — Eye region extraction and geometric gaze fallback.

Extracts cropped eye regions for visualization/debugging and provides
a simple geometric gaze estimator using iris position relative to eye
boundaries.

NOTE: The eye crops here are for visualization and the geometric fallback
only.  L2CS-Net receives a full *face* crop (see gaze_model.py).
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Optional, Tuple

import cv2
import numpy as np

from landmarks import FaceData, LEFT_EYE_CONTOUR, RIGHT_EYE_CONTOUR


# ------------------------------------------------------------------ #
#  Data structures
# ------------------------------------------------------------------ #

@dataclass
class EyeData:
    """Cropped eye regions and their bounding boxes."""

    left_eye_img: Optional[np.ndarray] = None   # Resized crop (for display)
    right_eye_img: Optional[np.ndarray] = None

    # Bounding boxes in the original frame's pixel coords (x, y, w, h)
    left_bbox: Tuple[int, int, int, int] = (0, 0, 0, 0)
    right_bbox: Tuple[int, int, int, int] = (0, 0, 0, 0)


class GazeDirection(str, Enum):
    """Coarse gaze direction labels for the geometric fallback."""
    LEFT = "LEFT"
    RIGHT = "RIGHT"
    CENTER = "CENTER"
    UP = "UP"
    DOWN = "DOWN"


# ------------------------------------------------------------------ #
#  Eye region extraction
# ------------------------------------------------------------------ #

def _eye_bbox(
    contour_px: list[Tuple[int, int]],
    img_h: int,
    img_w: int,
    padding: float = 0.3,
) -> Tuple[int, int, int, int]:
    """Compute a padded bounding box around an eye contour.

    Args:
        contour_px: List of (x, y) pixel coordinates for the eye contour.
        img_h, img_w: Frame dimensions (for clamping).
        padding: Fractional padding to add around the tight bbox.

    Returns:
        (x, y, w, h) clamped to the image boundaries.
    """
    xs = [p[0] for p in contour_px]
    ys = [p[1] for p in contour_px]
    x_min, x_max = min(xs), max(xs)
    y_min, y_max = min(ys), max(ys)

    w = x_max - x_min
    h = y_max - y_min
    pad_x = int(w * padding)
    pad_y = int(h * padding)

    x1 = max(0, x_min - pad_x)
    y1 = max(0, y_min - pad_y)
    x2 = min(img_w, x_max + pad_x)
    y2 = min(img_h, y_max + pad_y)

    return (x1, y1, x2 - x1, y2 - y1)


def extract_eye_regions(
    frame: np.ndarray,
    face: FaceData,
    padding: float = 0.3,
    display_size: Tuple[int, int] = (60, 36),
) -> EyeData:
    """Crop and resize both eye regions from *frame*.

    Args:
        frame: BGR image.
        face:  ``FaceData`` from the landmark detector.
        padding: Fractional padding around the eye contour bbox.
        display_size: (width, height) to resize the crops to.

    Returns:
        ``EyeData`` with cropped images and bounding boxes.
    """
    h, w = frame.shape[:2]

    left_bbox = _eye_bbox(face.left_eye_contour_px, h, w, padding)
    right_bbox = _eye_bbox(face.right_eye_contour_px, h, w, padding)

    left_img = _safe_crop(frame, left_bbox, display_size)
    right_img = _safe_crop(frame, right_bbox, display_size)

    return EyeData(
        left_eye_img=left_img,
        right_eye_img=right_img,
        left_bbox=left_bbox,
        right_bbox=right_bbox,
    )


def _safe_crop(
    frame: np.ndarray,
    bbox: Tuple[int, int, int, int],
    size: Tuple[int, int],
) -> Optional[np.ndarray]:
    """Crop *bbox* from *frame*, resize to *size*. Returns None if bbox is
    degenerate (width or height ≤ 0)."""
    x, y, bw, bh = bbox
    if bw <= 0 or bh <= 0:
        return None
    crop = frame[y : y + bh, x : x + bw]
    if crop.size == 0:
        return None
    return cv2.resize(crop, size, interpolation=cv2.INTER_AREA)


# ------------------------------------------------------------------ #
#  Geometric gaze fallback
# ------------------------------------------------------------------ #

class GeometricGazeEstimator:
    """Very coarse iris-based gaze direction estimator.

    Computes where the iris centre sits inside the eye bounding box
    and returns a direction label.  Useful only for testing the pipeline
    when L2CS-Net weights are not available.
    """

    def __init__(
        self,
        horizontal_threshold: float = 0.35,
        vertical_threshold: float = 0.35,
    ) -> None:
        """
        Args:
            horizontal_threshold: Fraction of eye width from each edge that
                counts as LEFT or RIGHT (0–0.5).
            vertical_threshold: Same for UP / DOWN.
        """
        self._h_thresh = horizontal_threshold
        self._v_thresh = vertical_threshold

    def estimate(self, face: FaceData) -> GazeDirection:
        """Return coarse gaze direction from iris position.

        Uses the average of both eyes' iris centres relative to their
        respective eye contour bounding boxes.
        """
        if not face.left_iris_px or not face.right_iris_px:
            return GazeDirection.CENTER

        # Compute normalised iris position for each eye (0 = leftmost,
        # 1 = rightmost for x; 0 = top, 1 = bottom for y).
        ratios = []
        for contour_indices, iris_center in [
            (face.left_eye_contour_px, face.left_iris_center_px),
            (face.right_eye_contour_px, face.right_iris_center_px),
        ]:
            xs = [p[0] for p in contour_indices]
            ys = [p[1] for p in contour_indices]
            x_min, x_max = min(xs), max(xs)
            y_min, y_max = min(ys), max(ys)
            eye_w = max(x_max - x_min, 1)
            eye_h = max(y_max - y_min, 1)

            rx = (iris_center[0] - x_min) / eye_w
            ry = (iris_center[1] - y_min) / eye_h
            ratios.append((rx, ry))

        avg_rx = sum(r[0] for r in ratios) / len(ratios)
        avg_ry = sum(r[1] for r in ratios) / len(ratios)

        # Horizontal takes priority over vertical.
        if avg_rx < self._h_thresh:
            return GazeDirection.RIGHT   # mirrored in webcam
        if avg_rx > (1.0 - self._h_thresh):
            return GazeDirection.LEFT    # mirrored in webcam
        if avg_ry < self._v_thresh:
            return GazeDirection.UP
        if avg_ry > (1.0 - self._v_thresh):
            return GazeDirection.DOWN

        return GazeDirection.CENTER
