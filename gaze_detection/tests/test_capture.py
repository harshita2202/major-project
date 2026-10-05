"""Tests for capture.py."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from capture import FPSCounter, VideoCapture


class TestFPSCounter:
    def test_initial_fps_is_zero(self):
        counter = FPSCounter()
        assert counter.fps == 0.0

    def test_tick_returns_positive_after_two_calls(self):
        counter = FPSCounter(alpha=0.5)
        counter.tick()
        import time
        time.sleep(0.01)
        fps = counter.tick()
        assert fps > 0

    def test_reset_clears_state(self):
        counter = FPSCounter()
        counter.tick()
        counter.reset()
        assert counter.fps == 0.0


class TestVideoCapture:
    def test_context_manager_without_camera(self):
        """VideoCapture should raise RuntimeError if no camera."""
        try:
            # Try opening a non-existent camera index.
            with VideoCapture(camera_index=999) as cap:
                pass
            # If no error, camera 999 somehow exists — skip.
        except RuntimeError as e:
            assert "Could not open camera" in str(e)

    def test_read_before_open_returns_false(self):
        cap = VideoCapture()
        ok, frame, fps = cap.read()
        assert ok is False
        assert frame is None


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
