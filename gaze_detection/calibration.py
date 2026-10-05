"""
calibration.py — 9-point screen calibration for gaze-to-screen mapping.

Displays calibration targets, collects gaze angle samples at each
target, then fits a regression from (pitch, yaw) to (screen_x, screen_y).

The calibration model is saved to / loaded from a JSON file so that
recalibration is only needed when the user changes position.

This module is independent of the gaze model implementation — it works
with any source that provides (pitch, yaw) in radians.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import numpy as np

try:
    from sklearn.linear_model import Ridge
    from sklearn.preprocessing import PolynomialFeatures
    _HAS_SKLEARN = True
except ImportError:
    _HAS_SKLEARN = False


# ------------------------------------------------------------------ #
#  Configuration
# ------------------------------------------------------------------ #

DEFAULT_CALIBRATION_PATH = Path(__file__).parent / "calibration_data" / "calibration.json"
NUM_SAMPLES_PER_POINT = 30      # frames to collect per target
SETTLE_SECONDS = 1.5            # pause before sampling starts
MARGIN_FRACTION = 0.1           # target distance from screen edges


# ------------------------------------------------------------------ #
#  Data structures
# ------------------------------------------------------------------ #

@dataclass
class CalibrationPoint:
    """One calibration measurement: gaze angles → screen position."""
    screen_x: float
    screen_y: float
    pitch: float   # average pitch (radians)
    yaw: float     # average yaw   (radians)


# ------------------------------------------------------------------ #
#  Screen size detection (Windows via ctypes, fallback configurable)
# ------------------------------------------------------------------ #

def get_screen_size() -> Tuple[int, int]:
    """Return (width, height) of the primary monitor in pixels."""
    try:
        import ctypes
        user32 = ctypes.windll.user32  # type: ignore[attr-defined]
        user32.SetProcessDPIAware()
        return (user32.GetSystemMetrics(0), user32.GetSystemMetrics(1))
    except Exception:
        # Sensible fallback.
        return (1920, 1080)


# ------------------------------------------------------------------ #
#  Screen mapper (uses calibration coefficients)
# ------------------------------------------------------------------ #

class ScreenMapper:
    """Maps gaze (pitch, yaw) → clamped screen (x, y) using saved
    calibration coefficients.

    The mapping is a simple linear (or polynomial) regression::

        screen_x = coeff_x @ features(pitch, yaw)
        screen_y = coeff_y @ features(pitch, yaw)

    ``features`` is ``[1, pitch, yaw]`` for linear, or includes
    polynomial terms for degree > 1.
    """

    def __init__(
        self,
        coeff_x: np.ndarray,
        coeff_y: np.ndarray,
        poly_degree: int,
        screen_w: int,
        screen_h: int,
    ) -> None:
        self._coeff_x = coeff_x
        self._coeff_y = coeff_y
        self._poly_degree = poly_degree
        self._screen_w = screen_w
        self._screen_h = screen_h

        if poly_degree > 1 and _HAS_SKLEARN:
            self._poly = PolynomialFeatures(degree=poly_degree,
                                            include_bias=True)
            # Fit on a dummy so the transformer knows the shape.
            self._poly.fit(np.zeros((1, 2)))
        else:
            self._poly = None

    def map(self, pitch: float, yaw: float) -> Tuple[int, int]:
        """Map gaze angles to screen coordinates, clamped to screen."""
        features = self._make_features(pitch, yaw)
        sx = float(features @ self._coeff_x)
        sy = float(features @ self._coeff_y)

        # Clamp to screen boundaries.
        sx = max(0.0, min(float(self._screen_w), sx))
        sy = max(0.0, min(float(self._screen_h), sy))
        return (int(sx), int(sy))

    def _make_features(self, pitch: float, yaw: float) -> np.ndarray:
        raw = np.array([[pitch, yaw]])
        if self._poly is not None:
            return self._poly.transform(raw).flatten()
        # Linear: [1, pitch, yaw]
        return np.array([1.0, pitch, yaw])

    # ---- Serialisation ------------------------------------------------

    def save(self, path: Path | str = DEFAULT_CALIBRATION_PATH) -> None:
        """Save calibration coefficients to a JSON file."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "coeff_x": self._coeff_x.tolist(),
            "coeff_y": self._coeff_y.tolist(),
            "poly_degree": self._poly_degree,
            "screen_w": self._screen_w,
            "screen_h": self._screen_h,
        }
        path.write_text(json.dumps(data, indent=2))
        print(f"[calibration] Saved calibration to {path}")

    @classmethod
    def load(cls, path: Path | str = DEFAULT_CALIBRATION_PATH) -> "ScreenMapper":
        """Load a previously saved calibration."""
        path = Path(path)
        if not path.is_file():
            raise FileNotFoundError(f"Calibration file not found: {path}")
        try:
            data = json.loads(path.read_text())
            return cls(
                coeff_x=np.array(data["coeff_x"]),
                coeff_y=np.array(data["coeff_y"]),
                poly_degree=data["poly_degree"],
                screen_w=data["screen_w"],
                screen_h=data["screen_h"],
            )
        except (json.JSONDecodeError, KeyError) as e:
            raise ValueError(f"Corrupted calibration file: {e}") from e


# ------------------------------------------------------------------ #
#  Calibration routine
# ------------------------------------------------------------------ #

class ScreenCalibrator:
    """Runs a 9-point calibration and produces a ``ScreenMapper``.

    The caller provides a *gaze callback* that, given a BGR frame,
    returns ``(pitch, yaw)`` or ``None``.
    """

    def __init__(
        self,
        screen_w: Optional[int] = None,
        screen_h: Optional[int] = None,
        poly_degree: int = 1,
        samples_per_point: int = NUM_SAMPLES_PER_POINT,
        settle_seconds: float = SETTLE_SECONDS,
    ) -> None:
        if not _HAS_SKLEARN:
            raise ImportError(
                "scikit-learn is required for calibration. "
                "Install with: pip install scikit-learn"
            )
        if screen_w is None or screen_h is None:
            screen_w, screen_h = get_screen_size()
        self._screen_w = screen_w
        self._screen_h = screen_h
        self._poly_degree = poly_degree
        self._samples = samples_per_point
        self._settle = settle_seconds

    def _target_points(self) -> List[Tuple[int, int]]:
        """Generate the 9 calibration target positions."""
        sw, sh = self._screen_w, self._screen_h
        mx = int(sw * MARGIN_FRACTION)
        my = int(sh * MARGIN_FRACTION)
        cols = [mx, sw // 2, sw - mx]
        rows = [my, sh // 2, sh - my]
        return [(c, r) for r in rows for c in cols]

    def calibrate(
        self,
        capture,
        gaze_callback,
    ) -> Optional[ScreenMapper]:
        """Run the interactive 9-point calibration.

        Args:
            capture: ``VideoCapture`` instance for reading frames.
            gaze_callback: ``callable(frame) -> (pitch, yaw) | None``
                A function that takes a BGR frame and returns the gaze
                angles, or ``None`` if no face is detected.

        Returns:
            A fitted ``ScreenMapper``, or ``None`` if calibration failed.
        """
        targets = self._target_points()
        collected: List[CalibrationPoint] = []
        window = "Calibration"

        print(f"[calibration] Starting 9-point calibration "
              f"({self._screen_w}x{self._screen_h})")

        for idx, (tx, ty) in enumerate(targets):
            # ---- Show the target on a black fullscreen canvas ----------
            canvas = np.zeros((self._screen_h, self._screen_w, 3),
                              dtype=np.uint8)
            # Draw target
            cv2.circle(canvas, (tx, ty), 20, (0, 255, 0), 2)
            cv2.circle(canvas, (tx, ty), 5, (0, 255, 0), -1)
            label = f"Point {idx + 1}/9 — Look at the green dot"
            cv2.putText(canvas, label, (tx - 180, ty - 35),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255),
                        1, cv2.LINE_AA)
            cv2.putText(canvas, "Press SPACE when ready, ESC to cancel",
                        (self._screen_w // 2 - 250, self._screen_h - 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180, 180, 180),
                        1, cv2.LINE_AA)

            cv2.namedWindow(window, cv2.WINDOW_NORMAL)
            cv2.setWindowProperty(window, cv2.WND_PROP_FULLSCREEN,
                                  cv2.WINDOW_FULLSCREEN)
            cv2.imshow(window, canvas)

            # Wait for SPACE to start sampling, or ESC to abort.
            while True:
                key = cv2.waitKey(30) & 0xFF
                if key == 27:  # ESC
                    cv2.destroyWindow(window)
                    print("[calibration] Calibration cancelled.")
                    return None
                if key == ord(" "):
                    break

            # ---- Settle period (ignore initial jitter) -----------------
            t0 = time.time()
            while time.time() - t0 < self._settle:
                ok, frame, _ = capture.read()
                if ok:
                    # Show countdown
                    remain = self._settle - (time.time() - t0)
                    info_canvas = canvas.copy()
                    cv2.putText(info_canvas, f"Settling... {remain:.1f}s",
                                (tx - 80, ty + 50),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                                (0, 200, 255), 1, cv2.LINE_AA)
                    cv2.imshow(window, info_canvas)
                    cv2.waitKey(1)

            # ---- Collect samples ----------------------------------------
            pitches, yaws = [], []
            attempts = 0
            max_attempts = self._samples * 5  # tolerate some missed frames

            while len(pitches) < self._samples and attempts < max_attempts:
                ok, frame, _ = capture.read()
                attempts += 1
                if not ok or frame is None:
                    continue
                result = gaze_callback(frame)
                if result is not None:
                    pitches.append(result[0])
                    yaws.append(result[1])

                # Show progress
                progress_canvas = canvas.copy()
                pct = len(pitches) / self._samples * 100
                cv2.putText(progress_canvas,
                            f"Collecting: {len(pitches)}/{self._samples}",
                            (tx - 100, ty + 50),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                            (0, 255, 255), 1, cv2.LINE_AA)
                cv2.imshow(window, progress_canvas)
                cv2.waitKey(1)

            if len(pitches) < 3:
                print(f"[calibration] Too few samples at point {idx + 1}, "
                      "skipping.")
                continue

            avg_pitch = float(np.mean(pitches))
            avg_yaw = float(np.mean(yaws))
            collected.append(CalibrationPoint(
                screen_x=tx, screen_y=ty,
                pitch=avg_pitch, yaw=avg_yaw,
            ))
            print(f"  Point {idx + 1}/9: target=({tx},{ty})  "
                  f"pitch={avg_pitch:+.4f}  yaw={avg_yaw:+.4f}  "
                  f"samples={len(pitches)}")

        cv2.destroyWindow(window)

        if len(collected) < 4:
            print("[calibration] Not enough calibration points collected.")
            return None

        # ---- Fit regression ---------------------------------------------
        mapper = self._fit(collected)
        print("[calibration] Calibration complete.")
        return mapper

    def _fit(self, points: List[CalibrationPoint]) -> ScreenMapper:
        """Fit a regression from gaze angles to screen coordinates."""
        X = np.array([[p.pitch, p.yaw] for p in points])
        y_sx = np.array([p.screen_x for p in points])
        y_sy = np.array([p.screen_y for p in points])

        if self._poly_degree > 1:
            poly = PolynomialFeatures(degree=self._poly_degree,
                                      include_bias=True)
            X_feat = poly.fit_transform(X)
        else:
            # Add bias column manually.
            X_feat = np.hstack([np.ones((len(X), 1)), X])

        reg_x = Ridge(alpha=1.0).fit(X_feat, y_sx)
        reg_y = Ridge(alpha=1.0).fit(X_feat, y_sy)

        # Ridge stores coef_ (no intercept since we included bias col).
        # But Ridge with fit_intercept=True (default) separates them.
        # Since we included a bias column ourselves, disable fit_intercept.
        reg_x2 = Ridge(alpha=1.0, fit_intercept=False).fit(X_feat, y_sx)
        reg_y2 = Ridge(alpha=1.0, fit_intercept=False).fit(X_feat, y_sy)

        return ScreenMapper(
            coeff_x=reg_x2.coef_,
            coeff_y=reg_y2.coef_,
            poly_degree=self._poly_degree,
            screen_w=self._screen_w,
            screen_h=self._screen_h,
        )
