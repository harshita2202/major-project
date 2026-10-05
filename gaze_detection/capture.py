"""
capture.py — Webcam video capture with FPS tracking.

Wraps cv2.VideoCapture with:
  - Configurable camera index and resolution
  - Exponential-moving-average FPS counter
  - Context-manager support for guaranteed resource cleanup
  - Graceful handling of init / read failures
"""

from __future__ import annotations

import time
from typing import Optional, Tuple

import cv2
import numpy as np


class FPSCounter:
    """Tracks frames-per-second using an exponential moving average (EMA).

    EMA produces a stable, readable number instead of the noisy
    instantaneous 1/dt value.
    """

    def __init__(self, alpha: float = 0.1) -> None:
        """
        Args:
            alpha: EMA smoothing factor (0–1). Smaller = smoother.
        """
        self._alpha = alpha
        self._fps: float = 0.0
        self._last_time: Optional[float] = None

    def tick(self) -> float:
        """Call once per frame. Returns the current smoothed FPS."""
        now = time.perf_counter()
        if self._last_time is not None:
            dt = now - self._last_time
            if dt > 0:
                instant_fps = 1.0 / dt
                if self._fps == 0.0:
                    # First valid measurement — seed the EMA.
                    self._fps = instant_fps
                else:
                    self._fps = self._alpha * instant_fps + (1 - self._alpha) * self._fps
        self._last_time = now
        return self._fps

    @property
    def fps(self) -> float:
        return self._fps

    def reset(self) -> None:
        self._fps = 0.0
        self._last_time = None


class VideoCapture:
    """Thin wrapper around cv2.VideoCapture with FPS tracking.

    Usage::

        with VideoCapture(camera_index=0, width=640, height=480) as cap:
            while True:
                ok, frame, fps = cap.read()
                if not ok:
                    break
                cv2.imshow("feed", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
    """

    def __init__(
        self,
        camera_index: int = 0,
        width: int = 640,
        height: int = 480,
        fps_alpha: float = 0.1,
    ) -> None:
        """
        Args:
            camera_index: Index passed to ``cv2.VideoCapture``.
            width:  Requested frame width (the camera may clamp this).
            height: Requested frame height.
            fps_alpha: EMA smoothing factor for the FPS counter.
        """
        self._camera_index = camera_index
        self._width = width
        self._height = height
        self._cap: Optional[cv2.VideoCapture] = None
        self._fps_counter = FPSCounter(alpha=fps_alpha)

    # ------------------------------------------------------------------ #
    #  Lifecycle
    # ------------------------------------------------------------------ #

    def open(self) -> None:
        """Open the camera. Raises RuntimeError on failure."""
        self._cap = cv2.VideoCapture(self._camera_index)
        if not self._cap.isOpened():
            raise RuntimeError(
                f"Could not open camera index {self._camera_index}. "
                "Check that the webcam is connected and not in use."
            )
        # Request the desired resolution (camera picks the closest match).
        self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self._width)
        self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self._height)

        # Read actual resolution the camera settled on.
        actual_w = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        actual_h = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        print(f"[capture] Camera opened: index={self._camera_index}, "
              f"resolution={actual_w}x{actual_h}")

    def release(self) -> None:
        """Release the camera (safe to call multiple times)."""
        if self._cap is not None:
            self._cap.release()
            self._cap = None
            print("[capture] Camera released.")

    # Context-manager support ------------------------------------------------

    def __enter__(self) -> "VideoCapture":
        self.open()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:  # noqa: ANN001
        self.release()

    # ------------------------------------------------------------------ #
    #  Frame reading
    # ------------------------------------------------------------------ #

    def read(self) -> Tuple[bool, Optional[np.ndarray], float]:
        """Read one frame from the camera.

        Returns:
            (success, frame, fps) where *frame* is a BGR ``np.ndarray``
            or ``None`` on failure, and *fps* is the smoothed FPS value.
        """
        if self._cap is None or not self._cap.isOpened():
            return False, None, 0.0

        ok, frame = self._cap.read()
        fps = self._fps_counter.tick()

        if not ok:
            return False, None, fps

        return True, frame, fps

    @property
    def fps(self) -> float:
        """Most recent smoothed FPS value."""
        return self._fps_counter.fps

    @property
    def is_opened(self) -> bool:
        return self._cap is not None and self._cap.isOpened()
