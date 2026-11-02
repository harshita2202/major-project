"""Typed configuration loaded from a single YAML file (``config.yaml``)."""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, Field

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG_PATH = PROJECT_ROOT / "config.yaml"


class AudioCfg(BaseModel):
    sample_rate: int = 16000
    client_chunk_ms: int = 250


class ModelsCfg(BaseModel):
    device: Literal["auto", "cpu", "cuda"] = "auto"
    vad_repo: str = "snakers4/silero-vad"
    embedding_source: str = "speechbrain/spkrec-ecapa-voxceleb"
    model_cache_dir: str = "pretrained_models"


class VadCfg(BaseModel):
    threshold: float = 0.5
    frame_samples: int = 512
    min_speech_ms: int = 250
    min_silence_ms: int = 100
    speech_pad_ms: int = 30


class EnrollmentCfg(BaseModel):
    target_duration_sec: float = 20.0
    min_speech_sec: float = 8.0
    min_segments: int = 6
    segment_sec: float = 2.0
    segment_overlap: float = Field(0.5, ge=0.0, lt=1.0)
    leave_one_out: bool = True
    threshold_std_factor: float = 3.0
    threshold_min: float = 0.25
    threshold_max: float = 0.55


class MonitoringCfg(BaseModel):
    window_sec: float = 2.0
    hop_sec: float = 1.0
    min_speech_ratio: float = 0.40
    strikes_to_warn: int = 3
    reset_strikes_on_match: bool = True
    max_strike_gap_sec: float = 4.0
    cooldown_sec: float = 10.0
    threshold_offset: float = 0.0
    silent_mic_sec: float = 15.0
    silent_rms_dbfs: float = -60.0


class LoggingCfg(BaseModel):
    clip_dir: str = "warning_clips"
    clip_pre_sec: float = 4.0
    max_events_per_session: int = 2000
    delete_clips_on_end: bool = False


class ServerCfg(BaseModel):
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = ["*"]
    session_idle_timeout_sec: float = 7200
    max_upload_mb: float = 20


class Settings(BaseModel):
    audio: AudioCfg = AudioCfg()
    models: ModelsCfg = ModelsCfg()
    vad: VadCfg = VadCfg()
    enrollment: EnrollmentCfg = EnrollmentCfg()
    monitoring: MonitoringCfg = MonitoringCfg()
    logging: LoggingCfg = LoggingCfg()
    server: ServerCfg = ServerCfg()

    def resolve_path(self, p: str) -> Path:
        """Resolve a config path relative to the project root."""
        path = Path(p)
        return path if path.is_absolute() else PROJECT_ROOT / path


def load_settings(path: str | os.PathLike[str] | None = None) -> Settings:
    cfg_path = Path(path or os.environ.get("VOICEGUARD_CONFIG", DEFAULT_CONFIG_PATH))
    data: dict = {}
    if cfg_path.exists():
        with open(cfg_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
    return Settings.model_validate(data)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return load_settings()
