"""Fast unit tests (no models needed):  python -m pytest tests -q"""
from __future__ import annotations

import numpy as np

from backend.app.config import MonitoringCfg, Settings
from backend.app.enrollment import compute_threshold, self_similarities, split_segments
from backend.app.monitor import StrikeTracker


def cfg(**kw: float) -> MonitoringCfg:
    return MonitoringCfg(**{"strikes_to_warn": 3, "cooldown_sec": 10.0, "max_strike_gap_sec": 4.0, **kw})


def feed(tr: StrikeTracker, sims: list[float], thr: float = 0.4, hop: float = 1.0) -> list[str]:
    return [tr.update(i * hop + 2.0, s, thr)[0] for i, s in enumerate(sims)]


def test_three_consecutive_strikes_warn() -> None:
    out = feed(StrikeTracker(cfg()), [0.1, 0.1, 0.1])
    assert out == ["mismatch", "mismatch", "warning"]


def test_match_resets_strikes() -> None:
    out = feed(StrikeTracker(cfg()), [0.1, 0.1, 0.8, 0.1, 0.1])
    assert "warning" not in out


def test_cooldown_suppresses_then_fires() -> None:
    tr = StrikeTracker(cfg())
    out = feed(tr, [0.1] * 16)
    warn_idx = [i for i, s in enumerate(out) if s == "warning"]
    assert warn_idx[0] == 2
    assert warn_idx[1] - warn_idx[0] >= 10  # 10 s cooldown at 1 s hop
    assert tr.warnings == 2


def test_strikes_separated_by_long_gap_do_not_accumulate() -> None:
    tr = StrikeTracker(cfg())
    tr.update(2.0, 0.1, 0.4)
    tr.update(3.0, 0.1, 0.4)
    status, _ = tr.update(30.0, 0.1, 0.4)  # long silence in between
    assert status == "mismatch" and tr.strikes == 1


def test_segments_50pct_overlap() -> None:
    sr = 16000
    segs = split_segments(np.zeros(sr * 10, dtype=np.float32), sr, 2.0, 0.5)
    assert len(segs) == 9 and all(len(s) == 2 * sr for s in segs)


def test_threshold_is_clipped() -> None:
    s = Settings()
    thr, _, _ = compute_threshold(np.array([0.9, 0.91, 0.89]), s)
    assert thr == s.enrollment.threshold_max
    thr, _, _ = compute_threshold(np.array([0.1, 0.9, 0.2, 0.8]), s)
    assert thr == s.enrollment.threshold_min


def test_leave_one_out_is_lower_than_inclusive() -> None:
    rng = np.random.default_rng(0)
    e = rng.standard_normal((8, 192)).astype(np.float32) + 2.0
    e /= np.linalg.norm(e, axis=1, keepdims=True)
    assert self_similarities(e, True).mean() < self_similarities(e, False).mean()
