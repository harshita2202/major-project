"""In-memory per-session state (profile, stream buffer, strikes, cooldown, event log)."""
from __future__ import annotations

import asyncio
import logging
import shutil
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from fastapi import WebSocket

from .config import Settings
from .enrollment import EnrollmentResult
from .models import ModelBundle
from .monitor import MonitorPipeline, WindowResult, utc_now_iso

log = logging.getLogger(__name__)


@dataclass
class Session:
    id: str
    enrollment: EnrollmentResult
    pipeline: MonitorPipeline
    clip_dir: Path
    created_at: str = field(default_factory=utc_now_iso)
    last_seen: float = field(default_factory=time.monotonic)
    events: deque[dict[str, Any]] = field(default_factory=lambda: deque(maxlen=2000))
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)   # serialises audio processing
    websocket: WebSocket | None = None                          # currently attached client
    pending: list[dict[str, Any]] = field(default_factory=list)  # system events to push to the client

    def touch(self) -> None:
        self.last_seen = time.monotonic()

    def log_event(self, kind: str, **data: Any) -> dict[str, Any]:
        ev = {"type": kind, "timestamp": utc_now_iso(), **data}
        self.events.append(ev)
        return ev

    def log_window(self, r: WindowResult) -> dict[str, Any]:
        """Every evaluated (non-silent) window is logged; warnings carry a clip path."""
        ev = {"type": "warning" if r.warning else "window", **r.to_dict()}
        if r.status != "silence":
            self.events.append(ev)
        if r.warning:
            log.warning("[%s] WARNING t=%.1fs sim=%.3f thr=%.3f clip=%s",
                        self.id[:8], r.stream_time, r.similarity or 0, r.threshold, r.clip_path)
        return ev

    def report(self, include_windows: bool = False) -> dict[str, Any]:
        evs = list(self.events)
        warnings = [e for e in evs if e["type"] == "warning"]
        sims = [e["similarity"] for e in evs if e.get("similarity") is not None]
        return {
            "session_id": self.id,
            "created_at": self.created_at,
            "threshold": round(self.pipeline.threshold, 4),
            "warnings_count": len(warnings),
            "windows_evaluated": self.pipeline.state.windows_evaluated,
            "similarity_mean": round(sum(sims) / len(sims), 4) if sims else None,
            "warnings": warnings,
            "events": evs if include_windows else [e for e in evs if e["type"] not in ("window",)],
        }


class SessionStore:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._sessions: dict[str, Session] = {}
        self.clip_root = settings.resolve_path(settings.logging.clip_dir)

    def create(self, enrollment: EnrollmentResult, models: ModelBundle) -> Session:
        sid = uuid.uuid4().hex
        clip_dir = self.clip_root / sid
        session_ref: dict[str, Session] = {}

        def on_system_event(kind: str, data: dict[str, Any]) -> None:
            if "s" in session_ref:
                s_ = session_ref["s"]
                s_.pending.append(s_.log_event(kind, **data))

        pipeline = MonitorPipeline(
            profile=enrollment.profile,
            base_threshold=enrollment.threshold,
            models=models,
            settings=self.settings,
            clip_dir=clip_dir,
            on_system_event=on_system_event,
        )
        s = Session(id=sid, enrollment=enrollment, pipeline=pipeline, clip_dir=clip_dir,
                    events=deque(maxlen=self.settings.logging.max_events_per_session))
        session_ref["s"] = s
        s.log_event("enrolled", threshold=round(enrollment.threshold, 4),
                    speech_sec=round(enrollment.speech_sec, 2), n_segments=enrollment.n_segments)
        self._sessions[sid] = s
        return s

    def get(self, sid: str) -> Session | None:
        s = self._sessions.get(sid)
        if s:
            s.touch()
        return s

    def end(self, sid: str) -> dict[str, Any] | None:
        """End the test: return the final report and wipe all session data from memory."""
        s = self._sessions.pop(sid, None)
        if s is None:
            return None
        s.log_event("session_ended")
        report = s.report(include_windows=False)
        if self.settings.logging.delete_clips_on_end and s.clip_dir.exists():
            shutil.rmtree(s.clip_dir, ignore_errors=True)
            report["clips_deleted"] = True
        # Drop references to biometric profile and audio buffer.
        s.pipeline.reset_stream()
        s.pipeline.profile = s.pipeline.profile * 0
        s.events.clear()
        return report

    def purge_idle(self) -> int:
        timeout = self.settings.server.session_idle_timeout_sec
        now = time.monotonic()
        stale = [sid for sid, s in self._sessions.items()
                 if s.websocket is None and now - s.last_seen > timeout]
        for sid in stale:
            log.info("Purging idle session %s", sid[:8])
            self.end(sid)
        return len(stale)

    def __len__(self) -> int:
        return len(self._sessions)
