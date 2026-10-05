"""
head_pose.py — Head pose estimation using cv2.solvePnP.

Estimates yaw, pitch, and roll of the head using 6 facial landmarks
and a generic 3-D face model.

Coordinate convention (OpenCV camera frame):
  - X → right
  - Y → down
  - Z → forward (into the scene)

Euler angles:
  - Yaw   = rotation around Y (positive = looking right)
  - Pitch = rotation around X (positive = looking down)
  - Roll  = rotation around Z (positive = tilting clockwise)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import cv2
import numpy as np

from landmarks import (
    FaceData,
    NOSE_TIP,
    CHIN,
    LEFT_EYE_LEFT_CORNER,
    RIGHT_EYE_RIGHT_CORNER,
    LEFT_MOUTH_CORNER,
    RIGHT_MOUTH_CORNER,
)


# ------------------------------------------------------------------ #
#  Data structures
# ------------------------------------------------------------------ #

@dataclass
class HeadPose:
    """Head orientation in degrees."""
    yaw: float    # left/right rotation
    pitch: float  # up/down rotation
    roll: float   # tilt rotation


# ------------------------------------------------------------------ #
#  Generic 3-D face model (in arbitrary millimetre-scale units)
# ------------------------------------------------------------------ #

# These approximate the positions of 6 keypoints on an average human
# face.  The origin is at the nose tip.
_MODEL_POINTS_3D = np.array([
    (0.0,    0.0,    0.0),      # Nose tip
    (0.0,   -330.0, -65.0),     # Chin
    (-225.0, 170.0, -135.0),    # Left eye left corner
    (225.0,  170.0, -135.0),    # Right eye right corner
    (-150.0, -150.0, -125.0),   # Left mouth corner
    (150.0,  -150.0, -125.0),   # Right mouth corner
], dtype=np.float64)

# MediaPipe landmark indices matching the 3-D model points above.
_LANDMARK_INDICES = [
    NOSE_TIP,
    CHIN,
    LEFT_EYE_LEFT_CORNER,
    RIGHT_EYE_RIGHT_CORNER,
    LEFT_MOUTH_CORNER,
    RIGHT_MOUTH_CORNER,
]


# ------------------------------------------------------------------ #
#  Head pose estimation
# ------------------------------------------------------------------ #

def estimate_head_pose(
    frame: np.ndarray,
    face: FaceData,
) -> Optional[HeadPose]:
    """Estimate head yaw/pitch/roll from 6 facial landmarks.

    Uses ``cv2.solvePnP`` to find the rotation of the 3-D face model
    that best matches the observed 2-D landmark positions.

    Args:
        frame: BGR image (used only for its dimensions to build the
               approximate camera matrix).
        face:  ``FaceData`` with pixel-space landmarks.

    Returns:
        ``HeadPose`` with angles in degrees, or ``None`` if PnP fails.
    """
    h, w = frame.shape[:2]

    # Collect the 2-D image points that correspond to the 3-D model.
    image_points = np.array(
        [face.landmarks_px[i] for i in _LANDMARK_INDICES],
        dtype=np.float64,
    )

    # Approximate camera intrinsics (no real calibration).
    focal_length = w  # rough approximation
    center = (w / 2.0, h / 2.0)
    camera_matrix = np.array([
        [focal_length, 0,            center[0]],
        [0,            focal_length, center[1]],
        [0,            0,            1.0],
    ], dtype=np.float64)

    # Assume no lens distortion.
    dist_coeffs = np.zeros((4, 1), dtype=np.float64)

    # Solve Perspective-n-Point to get rotation & translation vectors.
    success, rvec, tvec = cv2.solvePnP(
        _MODEL_POINTS_3D,
        image_points,
        camera_matrix,
        dist_coeffs,
        flags=cv2.SOLVEPNP_ITERATIVE,
    )
    if not success:
        return None

    # Convert the Rodrigues rotation vector to a rotation matrix,
    # then extract Euler angles.
    rmat, _ = cv2.Rodrigues(rvec)
    angles = _rotation_matrix_to_euler(rmat)

    return HeadPose(
        yaw=float(np.degrees(angles[1])),
        pitch=float(np.degrees(angles[0])),
        roll=float(np.degrees(angles[2])),
    )


def _rotation_matrix_to_euler(rmat: np.ndarray) -> np.ndarray:
    """Extract Euler angles (pitch, yaw, roll) from a 3×3 rotation matrix.

    Uses the convention R = Ry·Rx·Rz (yaw, pitch, roll).

    Returns:
        Array of [pitch, yaw, roll] in radians.
    """
    sy = np.sqrt(rmat[0, 0] ** 2 + rmat[1, 0] ** 2)

    singular = sy < 1e-6

    if not singular:
        pitch = np.arctan2(rmat[2, 1], rmat[2, 2])
        yaw = np.arctan2(-rmat[2, 0], sy)
        roll = np.arctan2(rmat[1, 0], rmat[0, 0])
    else:
        pitch = np.arctan2(-rmat[1, 2], rmat[1, 1])
        yaw = np.arctan2(-rmat[2, 0], sy)
        roll = 0.0

    return np.array([pitch, yaw, roll])


# ------------------------------------------------------------------ #
#  Visualisation helper
# ------------------------------------------------------------------ #

def draw_head_pose_axes(
    frame: np.ndarray,
    face: FaceData,
    head_pose: HeadPose,
    axis_length: float = 50.0,
) -> None:
    """Draw 3-D axis arrows at the nose tip to show head orientation.

    Red = X (right), Green = Y (down), Blue = Z (forward).
    """
    h, w = frame.shape[:2]
    nose = face.landmarks_px[NOSE_TIP]

    focal_length = w
    center = (w / 2.0, h / 2.0)
    camera_matrix = np.array([
        [focal_length, 0,            center[0]],
        [0,            focal_length, center[1]],
        [0,            0,            1.0],
    ], dtype=np.float64)
    dist_coeffs = np.zeros((4, 1), dtype=np.float64)

    image_points = np.array(
        [face.landmarks_px[i] for i in _LANDMARK_INDICES],
        dtype=np.float64,
    )
    success, rvec, tvec = cv2.solvePnP(
        _MODEL_POINTS_3D, image_points, camera_matrix, dist_coeffs,
        flags=cv2.SOLVEPNP_ITERATIVE,
    )
    if not success:
        return

    # Project 3-D axis endpoints to 2-D.
    axes_3d = np.float64([
        [axis_length, 0, 0],   # X
        [0, axis_length, 0],   # Y
        [0, 0, axis_length],   # Z
    ])
    axes_2d, _ = cv2.projectPoints(axes_3d, rvec, tvec,
                                   camera_matrix, dist_coeffs)

    origin = tuple(int(v) for v in nose)
    colors = [(0, 0, 255), (0, 255, 0), (255, 0, 0)]  # R, G, B
    for pt, color in zip(axes_2d, colors):
        end = (int(pt[0][0]), int(pt[0][1]))
        cv2.arrowedLine(frame, origin, end, color, 2, tipLength=0.2)
