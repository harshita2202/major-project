"""Model wrappers: Silero VAD and SpeechBrain ECAPA speaker embeddings.

Both models are loaded once per process and shared by all sessions. Silero VAD
is *stateful* (it keeps an RNN state between frames) so all calls into it are
serialised with a lock and the state is reset before every independent clip.
"""
from __future__ import annotations

import logging
import threading
from dataclasses import dataclass
from typing import Any, Callable

import numpy as np
import torch

from .config import Settings

log = logging.getLogger(__name__)


def resolve_device(pref: str) -> torch.device:
    if pref == "cuda" or (pref == "auto" and torch.cuda.is_available()):
        if torch.cuda.is_available():
            return torch.device("cuda")
        log.warning("CUDA requested but not available; falling back to CPU")
    return torch.device("cpu")


# ---------------------------------------------------------------------------
# VAD
# ---------------------------------------------------------------------------
class SileroVAD:
    """Thin, thread-safe wrapper around Silero VAD (torch.hub)."""

    def __init__(self, settings: Settings) -> None:
        self.cfg = settings.vad
        self.sr = settings.audio.sample_rate
        if self.sr not in (8000, 16000):
            raise ValueError("Silero VAD supports only 8 kHz or 16 kHz audio")
        model, utils = torch.hub.load(
            repo_or_dir=settings.models.vad_repo,
            model="silero_vad",
            trust_repo=True,
            onnx=False,
            verbose=False,
        )
        self.model = model.eval()  # tiny model: CPU is faster than GPU round-trips
        self._get_speech_timestamps: Callable[..., list[dict[str, int]]] = utils[0]
        self._lock = threading.Lock()

    @torch.no_grad()
    def frame_probs(self, audio: np.ndarray) -> np.ndarray:
        """Speech probability for every consecutive 512-sample frame of ``audio``."""
        n = self.cfg.frame_samples
        n_frames = len(audio) // n
        if n_frames == 0:
            return np.zeros(0, dtype=np.float32)
        x = torch.from_numpy(np.ascontiguousarray(audio[: n_frames * n], dtype=np.float32))
        probs = np.empty(n_frames, dtype=np.float32)
        with self._lock:
            self.model.reset_states()
            for i in range(n_frames):
                probs[i] = float(self.model(x[i * n : (i + 1) * n], self.sr))
            self.model.reset_states()
        return probs

    def speech_ratio(self, audio: np.ndarray) -> float:
        """Fraction of frames whose speech probability exceeds the VAD threshold."""
        probs = self.frame_probs(audio)
        if probs.size == 0:
            return 0.0
        return float((probs >= self.cfg.threshold).mean())

    @torch.no_grad()
    def extract_speech(self, audio: np.ndarray) -> np.ndarray:
        """Remove silence: return only the speech portions concatenated together."""
        x = torch.from_numpy(np.ascontiguousarray(audio, dtype=np.float32))
        with self._lock:
            self.model.reset_states()
            stamps = self._get_speech_timestamps(
                x,
                self.model,
                threshold=self.cfg.threshold,
                sampling_rate=self.sr,
                min_speech_duration_ms=self.cfg.min_speech_ms,
                min_silence_duration_ms=self.cfg.min_silence_ms,
                speech_pad_ms=self.cfg.speech_pad_ms,
            )
            self.model.reset_states()
        if not stamps:
            return np.zeros(0, dtype=np.float32)
        return np.concatenate([audio[s["start"] : s["end"]] for s in stamps]).astype(np.float32)


# ---------------------------------------------------------------------------
# Speaker embeddings
# ---------------------------------------------------------------------------
class SpeakerEmbedder:
    """SpeechBrain ECAPA-TDNN (VoxCeleb) → L2-normalised 192-d embeddings."""

    def __init__(self, settings: Settings) -> None:
        self.device = resolve_device(settings.models.device)
        savedir = settings.resolve_path(settings.models.model_cache_dir) / "spkrec-ecapa-voxceleb"
        try:  # SpeechBrain >= 1.0
            from speechbrain.inference.speaker import EncoderClassifier
        except ImportError:  # pragma: no cover - SpeechBrain 0.5.x
            from speechbrain.pretrained import EncoderClassifier  # type: ignore

        kwargs: dict[str, Any] = {
            "source": settings.models.embedding_source,
            "savedir": str(savedir),
            "run_opts": {"device": str(self.device)},
        }
        try:  # Windows without developer mode cannot create symlinks -> copy files instead
            from speechbrain.utils.fetching import LocalStrategy

            kwargs["local_strategy"] = LocalStrategy.COPY
        except ImportError:  # pragma: no cover
            pass
        self.model = EncoderClassifier.from_hparams(**kwargs)
        self.model.eval()
        self._lock = threading.Lock()
        log.info("Speaker embedder loaded on %s", self.device)

    @torch.no_grad()
    def embed_batch(self, segments: list[np.ndarray]) -> np.ndarray:
        """Embed equal- or variable-length segments. Returns (N, D) unit vectors."""
        if not segments:
            return np.zeros((0, 192), dtype=np.float32)
        max_len = max(len(s) for s in segments)
        batch = np.zeros((len(segments), max_len), dtype=np.float32)
        lens = np.zeros(len(segments), dtype=np.float32)
        for i, s in enumerate(segments):
            batch[i, : len(s)] = s
            lens[i] = len(s) / max_len
        wavs = torch.from_numpy(batch).to(self.device)
        wav_lens = torch.from_numpy(lens).to(self.device)
        with self._lock:
            emb = self.model.encode_batch(wavs, wav_lens)  # (N, 1, D)
        emb = emb.squeeze(1).float().cpu().numpy()
        return l2_normalize(emb)

    def embed(self, audio: np.ndarray) -> np.ndarray:
        return self.embed_batch([audio])[0]


def l2_normalize(x: np.ndarray, axis: int = -1, eps: float = 1e-10) -> np.ndarray:
    return x / (np.linalg.norm(x, axis=axis, keepdims=True) + eps)


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(l2_normalize(a), l2_normalize(b)))


# ---------------------------------------------------------------------------
# Shared singleton
# ---------------------------------------------------------------------------
@dataclass
class ModelBundle:
    vad: SileroVAD
    embedder: SpeakerEmbedder


_bundle: ModelBundle | None = None
_bundle_lock = threading.Lock()


def get_models(settings: Settings) -> ModelBundle:
    """Load models lazily, once per process."""
    global _bundle
    with _bundle_lock:
        if _bundle is None:
            log.info("Loading Silero VAD and ECAPA speaker model ...")
            _bundle = ModelBundle(vad=SileroVAD(settings), embedder=SpeakerEmbedder(settings))
        return _bundle
