"""Streaming monitor pipeline (framework-agnostic, used by the WebSocket AND the test script).

Audio is pushed in arbitrary-sized chunks. Every ``hop_sec`` of *stream* time the
last ``window_sec`` of audio is evaluated:

    VAD speech ratio < min_speech_ratio  -> "silence"  (skipped, strikes untouched)
    cosine(embedding, profile) >= thr    -> "match"    (strikes reset)
    cosine(embedding, profile) <  thr    -> "mismatch" (strike += 1)
    strikes >= strikes_to_warn           -> "warning"  (unless inside the cooldown)

All timing decisions use stream time (sample counts), so results are identical
whether audio arrives live from a browser or from a WAV file in a test.
"""
from __future__ import annotations

import logging
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Literal

import numpy as np

from .audio import rms_dbfs, write_clip
from .config import MonitoringCfg, Settings
from .models import ModelBundle

log = logging.getLogger(__name__)

WindowStatus = Literal["silence", "match", "mismatch", "warning"]


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


@dataclass
class WindowResult:
    stream_time: float               # seconds since monitoring started (end of window)
    timestamp: str                   # wall-clock UTC ISO-8601
    status: WindowStatus
    speech_ratio: float
    similarity: float | None
    threshold: float
    strikes: int
    warning: bool = False
    suppressed_by_cooldown: bool = False
    cooldown_remaining: float = 0.0
    clip_path: str | None = None
    rms_dbfs: float = -120.0
    latency_ms: float = 0.0          # processing time for this window

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        if d["similarity"] is not None:
            d["similarity"] = round(d["similarity"], 4)
        d["speech_ratio"] = round(d["speech_ratio"], 3)
        d["rms_dbfs"] = round(d["rms_dbfs"], 1)
        d["latency_ms"] = round(d["latency_ms"], 1)
        return d


@dataclass
class StrikeTracker:
    """Pure strike/cooldown state machine (no audio, no models).

    Shared by the live pipeline and by the offline threshold sweep in the test script,
    so both apply exactly the same rules.
    """

    cfg: MonitoringCfg
    strikes: int = 0
    last_strike_t: float = -1e9
    last_warning_t: float = -1e9
    warnings: int = 0

    def cooldown_remaining(self, t: float) -> float:
        return max(0.0, self.cfg.cooldown_sec - (t - self.last_warning_t))

    def update(self, t: float, sim: float, threshold: float) -> tuple[WindowStatus, bool]:
        """Feed one evaluated window. Returns (status, suppressed_by_cooldown)."""
        cfg = self.cfg
        if sim >= threshold:
            if cfg.reset_strikes_on_match:
                self.strikes = 0
            return "match", False
        if t - self.last_strike_t > cfg.max_strike_gap_sec:
            self.strikes = 0  # previous strikes too old to be "consecutive"
        self.strikes += 1
        self.last_strike_t = t
        if self.strikes < cfg.strikes_to_warn:
            return "mismatch", False
        if self.cooldown_remaining(t) > 0.0:
            return "mismatch", True
        self.warnings += 1
        self.last_warning_t = t
        self.strikes = 0
        return "warning", False


@dataclass
class MonitorState:
    last_sound_t: float = 0.0
    mic_silent_flagged: bool = False
    windows_evaluated: int = 0


@dataclass
class MonitorPipeline:
    profile: np.ndarray
    base_threshold: float
    models: ModelBundle
    settings: Settings
    clip_dir: Path | None = None                     # None => never write clips (e.g. dry runs)
    on_system_event: Callable[[str, dict[str, Any]], None] | None = None
    clock: Callable[[], float] | None = None         # optional, for latency measurement

    state: MonitorState = field(default_factory=MonitorState)

    def __post_init__(self) -> None:
        cfg = self.settings.monitoring
        self.tracker = StrikeTracker(cfg)
        self.sr = self.settings.audio.sample_rate
        self.win = int(round(cfg.window_sec * self.sr))
        self.hop = int(round(cfg.hop_sec * self.sr))
        self.keep = max(self.win, int(round(self.settings.logging.clip_pre_sec * self.sr)))
        self.threshold = float(self.base_threshold + cfg.threshold_offset)
        self._buf = np.zeros(0, dtype=np.float32)
        self._buf_start = 0                          # absolute sample index of _buf[0]
        self._total = 0                              # absolute samples received
        self._next_eval = self.win                   # absolute sample index of next window end

    # ------------------------------------------------------------------ API
    @property
    def stream_time(self) -> float:
        return self._total / self.sr

    def reset_stream(self) -> None:
        """Discard buffered audio after a disconnect; strikes/cooldown are preserved."""
        self._buf = np.zeros(0, dtype=np.float32)
        self._buf_start = self._total
        self._next_eval = self._total + self.win
        self.state.last_sound_t = self.stream_time

    def push(self, chunk: np.ndarray) -> list[WindowResult]:
        """Append audio and evaluate every window whose end has been reached."""
        if chunk.size == 0:
            return []
        self._buf = np.concatenate([self._buf, chunk.astype(np.float32, copy=False)])
        self._total += len(chunk)
        self._check_silent_mic(chunk)

        results: list[WindowResult] = []
        while self._total >= self._next_eval:
            results.append(self._evaluate(self._next_eval))
            self._next_eval += self.hop
        self._trim()
        return results

    # ------------------------------------------------------------ internals
    def _slice(self, end_abs: int, length: int) -> np.ndarray:
        end = end_abs - self._buf_start
        return self._buf[max(0, end - length) : end]

    def _trim(self) -> None:
        # Keep enough history for the next window and for a warning clip.
        keep_from = max(0, min(self._next_eval - self.win, self._total - self.keep))
        drop = keep_from - self._buf_start
        if drop > 0:
            self._buf = self._buf[drop:]
            self._buf_start = keep_from

    def _check_silent_mic(self, chunk: np.ndarray) -> None:
        cfg = self.settings.monitoring
        t = self.stream_time
        if rms_dbfs(chunk) > cfg.silent_rms_dbfs:
            self.state.last_sound_t = t
            if self.state.mic_silent_flagged:
                self.state.mic_silent_flagged = False
                self._emit("mic_ok", {"stream_time": round(t, 2)})
        elif not self.state.mic_silent_flagged and t - self.state.last_sound_t >= cfg.silent_mic_sec:
            self.state.mic_silent_flagged = True
            self._emit("silent_mic", {"stream_time": round(t, 2), "silent_for_sec": round(t - self.state.last_sound_t, 1)})

    def _emit(self, kind: str, data: dict[str, Any]) -> None:
        if self.on_system_event:
            self.on_system_event(kind, data)

    def _now(self) -> float:
        return (self.clock or time.perf_counter)()

    def _evaluate(self, end_abs: int) -> WindowResult:
        t0 = self._now()
        cfg = self.settings.monitoring
        tr = self.tracker
        t = end_abs / self.sr
        window = self._slice(end_abs, self.win)
        self.state.windows_evaluated += 1

        ratio = self.models.vad.speech_ratio(window)
        res = WindowResult(
            stream_time=round(t, 3),
            timestamp=utc_now_iso(),
            status="silence",
            speech_ratio=ratio,
            similarity=None,
            threshold=self.threshold,
            strikes=tr.strikes,
            cooldown_remaining=round(tr.cooldown_remaining(t), 2),
            rms_dbfs=rms_dbfs(window),
        )
        if ratio < cfg.min_speech_ratio:
            res.latency_ms = (self._now() - t0) * 1000
            return res

        emb = self.models.embedder.embed(window)
        sim = float(np.dot(emb, self.profile))
        res.similarity = sim
        res.status, res.suppressed_by_cooldown = tr.update(t, sim, self.threshold)
        if res.status == "warning":
            res.warning = True
            res.clip_path = self._save_clip(end_abs, tr.warnings)
        res.strikes = tr.strikes
        res.cooldown_remaining = round(tr.cooldown_remaining(t), 2)
        res.latency_ms = (self._now() - t0) * 1000
        return res

    def _save_clip(self, end_abs: int, n: int) -> str | None:
        if self.clip_dir is None:
            return None
        clip = self._slice(end_abs, int(round(self.settings.logging.clip_pre_sec * self.sr)))
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        path = self.clip_dir / f"warning_{n:03d}_{stamp}_t{end_abs / self.sr:.1f}s.wav"
        try:
            write_clip(path, clip, self.sr)
            return str(path)
        except OSError:
            log.exception("Failed to write warning clip %s", path)
            return None
