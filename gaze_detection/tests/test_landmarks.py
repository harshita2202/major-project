"""Tests for landmarks.py."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pytest
from landmarks import (
    FaceLandmarkDetector,
    FaceData,
    LEFT_EYE_CONTOUR,
    RIGHT_EYE_CONTOUR,
    LEFT_IRIS,
    RIGHT_IRIS,
    HEAD_POSE_LANDMARKS,
)


class TestConstants:
    def test_eye_contour_lengths(self):
        assert len(LEFT_EYE_CONTOUR) == 16
        assert len(RIGHT_EYE_CONTOUR) == 16

    def test_iris_lengths(self):
        assert len(LEFT_IRIS) == 5
        assert len(RIGHT_IRIS) == 5

    def test_head_pose_landmarks_length(self):
        assert len(HEAD_POSE_LANDMARKS) == 6

    def test_iris_indices_in_range(self):
        for idx in LEFT_IRIS + RIGHT_IRIS:
            assert 468 <= idx <= 477


class TestFaceLandmarkDetector:
    def test_detect_on_blank_image_returns_empty(self):
        """A blank image should produce no face detections."""
        try:
            detector = FaceLandmarkDetector(max_faces=1)
        except FileNotFoundError:
            pytest.skip("face_landmarker.task model not found")
        blank = np.zeros((480, 640, 3), dtype=np.uint8)
        faces = detector.detect(blank)
        assert faces == []
        detector.close()

    def test_face_data_fields(self):
        """Verify FaceData dataclass fields exist."""
        face = FaceData(
            landmarks=[(0.5, 0.5, 0.0)],
            landmarks_px=[(320, 240)],
            bbox=(100, 100, 200, 200),
        )
        assert face.bbox == (100, 100, 200, 200)
        assert len(face.landmarks) == 1


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
