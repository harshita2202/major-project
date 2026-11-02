"""Enrollment: build a normalised voice profile and an automatic threshold."""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from .audio import rms_dbfs
from .config import Settings
from .models import ModelBundle, l2_normalize


class EnrollmentError(Exception):
    """Raised when the enrollment recording is unusable. ``code`` is machine-readable."""

    def __init__(self, code: str, message: str, **details: float) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details


@dataclass
class EnrollmentResult:
    profile: np.ndarray
    threshold: float
    speech_sec: float
    n_segments: int
    self_sim_mean: float
    self_sim_std: float
    self_sims: list[float] = field(default_factory=list)


def split_segments(audio: np.ndarray, sr: int, seg_sec: float, overlap: float) -> list[np.ndarray]:
    """Fixed-length segments with the given fractional overlap (0.5 → 50 %)."""
    seg = int(round(seg_sec * sr))
    hop = max(1, int(round(seg * (1.0 - overlap))))
    if len(audio) < seg:
        return []
    return [audio[s : s + seg] for s in range(0, len(audio) - seg + 1, hop)]


def self_similarities(emb: np.ndarray, leave_one_out: bool) -> np.ndarray:
    """Cosine similarity of every segment embedding to the (optionally leave-one-out) profile."""
    if leave_one_out and len(emb) > 1:
        total = emb.sum(axis=0, keepdims=True)
        others = l2_normalize(total - emb)  # profile built without segment i
        return np.einsum("nd,nd->n", emb, others)
    profile = l2_normalize(emb.mean(axis=0))
    return emb @ profile


def compute_threshold(sims: np.ndarray, settings: Settings) -> tuple[float, float, float]:
    cfg = settings.enrollment
    mean, std = float(sims.mean()), float(sims.std())
    thr = float(np.clip(mean - cfg.threshold_std_factor * std, cfg.threshold_min, cfg.threshold_max))
    return thr, mean, std


def enroll(audio: np.ndarray, models: ModelBundle, settings: Settings) -> EnrollmentResult:
    """Full enrollment pipeline. Raises :class:`EnrollmentError` on unusable input."""
    sr = settings.audio.sample_rate
    cfg = settings.enrollment

    if audio.size < sr:  # < 1 s
        raise EnrollmentError("too_short", "Recording is too short. Please record again.")
    if rms_dbfs(audio) < settings.monitoring.silent_rms_dbfs:
        raise EnrollmentError(
            "silent_audio",
            "No sound was captured. Check that your microphone is connected and not muted.",
        )

    speech = models.vad.extract_speech(audio)
    speech_sec = len(speech) / sr
    if speech_sec < cfg.min_speech_sec:
        raise EnrollmentError(
            "insufficient_speech",
            f"Only {speech_sec:.1f}s of speech detected (need {cfg.min_speech_sec:.0f}s). "
            "Please read the paragraph aloud clearly and try again.",
            speech_sec=speech_sec,
        )

    segments = split_segments(speech, sr, cfg.segment_sec, cfg.segment_overlap)
    if len(segments) < cfg.min_segments:
        raise EnrollmentError(
            "too_few_segments",
            f"Not enough speech segments ({len(segments)} < {cfg.min_segments}). Please try again.",
            speech_sec=speech_sec,
        )

    emb = models.embedder.embed_batch(segments)
    profile = l2_normalize(emb.mean(axis=0))
    sims = self_similarities(emb, cfg.leave_one_out)
    threshold, mean, std = compute_threshold(sims, settings)

    return EnrollmentResult(
        profile=profile.astype(np.float32),
        threshold=threshold,
        speech_sec=speech_sec,
        n_segments=len(segments),
        self_sim_mean=mean,
        self_sim_std=std,
        self_sims=[round(float(s), 4) for s in sims],
    )
