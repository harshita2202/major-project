"""Tests for head_pose.py."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from landmarks import FaceData, HEAD_POSE_LANDMARKS
from head_pose import estimate_head_pose, HeadPose


def _make_face_with_landmarks() -> FaceData:
    """Create a FaceData with realistic-ish landmark positions for a
    forward-facing person in a 640x480 image."""
    # Create 478 placeholder landmarks
    landmarks_px = [(320, 240)] * 478

    # Set the 6 head-pose landmarks to positions that approximate
    # a forward-facing face.
    pose_positions = {
        1:   (320, 250),   # nose tip
        152: (320, 380),   # chin
        33:  (250, 210),   # left eye left corner
        263: (390, 210),   # right eye right corner
        61:  (275, 340),   # left mouth corner
        291: (365, 340),   # right mouth corner
    }
    for idx, pos in pose_positions.items():
        landmarks_px[idx] = pos

    return FaceData(
        landmarks=[(px / 640, py / 480, 0.0) for px, py in landmarks_px],
        landmarks_px=landmarks_px,
        bbox=(200, 150, 240, 280),
    )


class TestHeadPose:
    def test_estimate_returns_head_pose(self):
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        face = _make_face_with_landmarks()
        hp = estimate_head_pose(frame, face)
        assert hp is not None
        assert isinstance(hp, HeadPose)

    def test_angles_are_finite(self):
        """solvePnP should produce finite angles with valid landmarks."""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        face = _make_face_with_landmarks()
        hp = estimate_head_pose(frame, face)
        assert hp is not None
        # Verify angles are finite (exact values depend on the
        # synthetic landmark geometry, which may not perfectly model
        # a frontal face).
        assert -180 <= hp.yaw <= 180
        assert -180 <= hp.pitch <= 180
        assert -180 <= hp.roll <= 180

    def test_head_pose_dataclass(self):
        hp = HeadPose(yaw=10.0, pitch=-5.0, roll=2.0)
        assert hp.yaw == 10.0
        assert hp.pitch == -5.0
        assert hp.roll == 2.0


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
