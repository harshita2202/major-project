"""
smoothing.py — Temporal smoothing for gaze coordinates.

Provides an Exponential Moving Average (EMA) smoother that reduces
jitter in the estimated screen gaze point.

This module is independent of the gaze model — it works on any
(x, y) coordinate stream.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Tuple


@dataclass
class SmoothedPoint:
    """A 2-D point with smoothing applied."""
    x: float
    y: float


class GazeSmoother:
    """Exponential Moving Average smoother for 2-D gaze coordinates.

    Formula::

        smoothed_x = α · current_x + (1 − α) · previous_x
        smoothed_y = α · current_y + (1 − α) · previous_y

    A smaller α means heavier smoothing (more lag, less jitter).
    A larger  α means lighter smoothing (less lag, more jitter).

    Usage::

        smoother = GazeSmoother(alpha=0.3)
        for x, y in gaze_stream:
            pt = smoother.update(x, y)
            print(pt.x, pt.y)
    """

    def __init__(self, alpha: float = 0.3) -> None:
        """
        Args:
            alpha: EMA smoothing factor in (0, 1].
                   0.2–0.4 is a good starting range for gaze.
        """
        if not 0.0 < alpha <= 1.0:
            raise ValueError(f"alpha must be in (0, 1], got {alpha}")
        self._alpha = alpha
        self._prev: Optional[Tuple[float, float]] = None

    def update(self, x: float, y: float) -> SmoothedPoint:
        """Feed a new raw gaze point and return the smoothed result.

        The very first call returns the raw point unchanged (there is
        no history to blend with).
        """
        if self._prev is None:
            self._prev = (x, y)
            return SmoothedPoint(x, y)

        sx = self._alpha * x + (1 - self._alpha) * self._prev[0]
        sy = self._alpha * y + (1 - self._alpha) * self._prev[1]
        self._prev = (sx, sy)
        return SmoothedPoint(sx, sy)

    def reset(self) -> None:
        """Clear history (e.g. after recalibration)."""
        self._prev = None

    @property
    def alpha(self) -> float:
        return self._alpha

    @alpha.setter
    def alpha(self, value: float) -> None:
        if not 0.0 < value <= 1.0:
            raise ValueError(f"alpha must be in (0, 1], got {value}")
        self._alpha = value
