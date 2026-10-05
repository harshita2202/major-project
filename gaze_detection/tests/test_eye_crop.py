"""Tests for eye_crop.py."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from landmarks import FaceData
from eye_crop import (
    extract_eye_regions,
    GeometricGazeEstimator,
    GazeDirection,
)


def _make_fake_face() -> FaceData:
    """Create a synthetic FaceData for testing."""
    # Simulate a face in a 640x480 image.
    left_eye_contour = [
        (200, 200), (205, 195), (210, 193), (215, 192),
        (220, 193), (225, 195), (230, 200), (225, 205),
        (220, 207), (215, 208), (210, 207), (205, 205),
        (200, 202), (203, 198), (213, 194), (223, 198),
    ]
    right_eye_contour = [
        (350, 200), (355, 195), (360, 193), (365, 192),
        (370, 193), (375, 195), (380, 200), (375, 205),
        (370, 207), (365, 208), (360, 207), (355, 205),
        (350, 202), (353, 198), (363, 194), (373, 198),
    ]
    # Iris in centre of each eye
    left_iris = [(215, 200), (213, 198), (217, 198), (213, 202), (217, 202)]
    right_iris = [(365, 200), (363, 198), (367, 198), (363, 202), (367, 202)]

    return FaceData(
        landmarks=[(0.5, 0.5, 0.0)] * 478,
        landmarks_px=[(320, 240)] * 478,
        bbox=(150, 150, 280, 280),
        left_eye_contour_px=left_eye_contour,
        right_eye_contour_px=right_eye_contour,
        left_iris_px=left_iris,
        right_iris_px=right_iris,
        left_iris_center_px=(215, 200),
        right_iris_center_px=(365, 200),
    )


class TestExtractEyeRegions:
    def test_returns_eye_data(self):
        frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
        face = _make_fake_face()
        eye_data = extract_eye_regions(frame, face)
        assert eye_data.left_eye_img is not None
        assert eye_data.right_eye_img is not None
        # Default display size is 60x36
        assert eye_data.left_eye_img.shape == (36, 60, 3)
        assert eye_data.right_eye_img.shape == (36, 60, 3)

    def test_bboxes_are_valid(self):
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        face = _make_fake_face()
        eye_data = extract_eye_regions(frame, face)
        for bbox in [eye_data.left_bbox, eye_data.right_bbox]:
            x, y, w, h = bbox
            assert w > 0
            assert h > 0


class TestGeometricGazeEstimator:
    def test_center_gaze(self):
        estimator = GeometricGazeEstimator()
        face = _make_fake_face()
        direction = estimator.estimate(face)
        assert isinstance(direction, GazeDirection)
        # Iris is centered, so should return CENTER
        assert direction == GazeDirection.CENTER

    def test_all_directions_valid(self):
        for d in GazeDirection:
            assert d.value in ("LEFT", "RIGHT", "CENTER", "UP", "DOWN")


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
