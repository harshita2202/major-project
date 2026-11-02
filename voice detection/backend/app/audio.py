"""Audio helpers: decoding, resampling, PCM16 conversion, level metering, clip writing."""
from __future__ import annotations

import io
from pathlib import Path

import numpy as np
import soundfile as sf
import torch
import torchaudio.functional as AF


def pcm16_bytes_to_float(data: bytes) -> np.ndarray:
    """Little-endian signed 16-bit PCM → float32 in [-1, 1]."""
    if len(data) % 2:
        data = data[:-1]
    return np.frombuffer(data, dtype="<i2").astype(np.float32) / 32768.0


def float_to_pcm16(audio: np.ndarray) -> np.ndarray:
    return (np.clip(audio, -1.0, 1.0) * 32767.0).astype("<i2")


def resample(audio: np.ndarray, orig_sr: int, target_sr: int) -> np.ndarray:
    if orig_sr == target_sr or audio.size == 0:
        return audio.astype(np.float32, copy=False)
    x = torch.from_numpy(np.ascontiguousarray(audio, dtype=np.float32))
    return AF.resample(x, orig_sr, target_sr).numpy()


def to_mono(audio: np.ndarray) -> np.ndarray:
    return audio if audio.ndim == 1 else audio.mean(axis=1)


def decode_audio(data: bytes, target_sr: int, raw_pcm_sr: int | None = None) -> np.ndarray:
    """Decode an uploaded file (WAV/FLAC/OGG via libsndfile) or raw PCM16 into mono float32.

    If ``raw_pcm_sr`` is given, ``data`` is treated as headerless PCM16 at that rate.
    """
    if raw_pcm_sr is not None:
        return resample(pcm16_bytes_to_float(data), raw_pcm_sr, target_sr)
    audio, sr = sf.read(io.BytesIO(data), dtype="float32", always_2d=False)
    return resample(to_mono(audio), int(sr), target_sr)


def load_wav(path: str | Path, target_sr: int) -> np.ndarray:
    audio, sr = sf.read(str(path), dtype="float32", always_2d=False)
    return resample(to_mono(audio), int(sr), target_sr)


def rms_dbfs(audio: np.ndarray) -> float:
    if audio.size == 0:
        return -120.0
    rms = float(np.sqrt(np.mean(np.square(audio), dtype=np.float64)))
    return 20.0 * np.log10(max(rms, 1e-6))


def write_clip(path: Path, audio: np.ndarray, sr: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sf.write(str(path), float_to_pcm16(audio), sr, subtype="PCM_16")
