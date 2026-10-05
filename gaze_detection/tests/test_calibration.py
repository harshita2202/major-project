"""Tests for calibration.py."""

import sys
import os
import tempfile
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import pytest

try:
    from calibration import ScreenMapper, CalibrationPoint, get_screen_size
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


@pytest.mark.skipif(not HAS_SKLEARN, reason="scikit-learn not installed")
class TestScreenMapper:
    def _make_mapper(self) -> ScreenMapper:
        """Create a simple linear mapper (identity-ish)."""
        # coeff_x for [1, pitch, yaw]: screen_x ≈ 960 + 5000 * yaw
        # coeff_y for [1, pitch, yaw]: screen_y ≈ 540 + 5000 * pitch
        coeff_x = np.array([960.0, 0.0, 5000.0])
        coeff_y = np.array([540.0, 5000.0, 0.0])
        return ScreenMapper(coeff_x, coeff_y, poly_degree=1,
                            screen_w=1920, screen_h=1080)

    def test_map_center(self):
        mapper = self._make_mapper()
        x, y = mapper.map(0.0, 0.0)
        assert x == 960
        assert y == 540

    def test_map_clamps_to_screen(self):
        mapper = self._make_mapper()
        # Extreme yaw should clamp to screen edge.
        x, y = mapper.map(0.0, 10.0)
        assert x == 1920  # clamped
        assert 0 <= y <= 1080

    def test_save_and_load(self, tmp_path):
        mapper = self._make_mapper()
        path = tmp_path / "cal.json"
        mapper.save(path)
        loaded = ScreenMapper.load(path)
        x1, y1 = mapper.map(0.1, -0.05)
        x2, y2 = loaded.map(0.1, -0.05)
        assert x1 == x2
        assert y1 == y2

    def test_load_nonexistent_raises(self, tmp_path):
        with pytest.raises(FileNotFoundError):
            ScreenMapper.load(tmp_path / "nope.json")

    def test_load_corrupted_raises(self, tmp_path):
        path = tmp_path / "bad.json"
        path.write_text("not json!")
        with pytest.raises(ValueError):
            ScreenMapper.load(path)


class TestGetScreenSize:
    def test_returns_tuple(self):
        size = get_screen_size()
        assert isinstance(size, tuple)
        assert len(size) == 2
        w, h = size
        assert w > 0
        assert h > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
