"""FastAPI application: REST enrollment/events + WebSocket live monitoring.

Run from the project root:
    python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
"""
from __future__ import annotations

import asyncio
import contextlib
import json
import logging
from collections.abc import AsyncIterator
from typing import Any

from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.websockets import WebSocketState

from .audio import decode_audio, pcm16_bytes_to_float
from .config import PROJECT_ROOT, get_settings
from .enrollment import EnrollmentError, enroll
from .models import ModelBundle, get_models
from .sessions import Session, SessionStore

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("voiceguard")

settings = get_settings()
store = SessionStore(settings)
_models: ModelBundle | None = None

# WebSocket close codes (4000-4999 are application-defined)
WS_UNKNOWN_SESSION = 4404   # client must re-enroll; do NOT auto-reconnect
WS_REPLACED = 4409          # a newer connection for the same session took over
WS_ENDED = 4000             # test ended normally


def models() -> ModelBundle:
    if _models is None:
        raise HTTPException(503, detail={"code": "models_loading", "message": "Models are still loading, retry shortly."})
    return _models


async def _purge_loop() -> None:
    while True:
        await asyncio.sleep(60)
        store.purge_idle()


@contextlib.asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    global _models
    _models = await asyncio.to_thread(get_models, settings)
    log.info("Models ready (embeddings on %s)", _models.embedder.device)
    task = asyncio.create_task(_purge_loop())
    try:
        yield
    finally:
        task.cancel()


app = FastAPI(title="VoiceGuard – multi-voice detection", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.server.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# REST
# ---------------------------------------------------------------------------
@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok" if _models else "loading",
        "device": str(_models.embedder.device) if _models else None,
        "active_sessions": len(store),
    }


@app.get("/config/client")
async def client_config() -> dict[str, Any]:
    """Values the frontend needs (kept in sync with config.yaml)."""
    return {
        "sample_rate": settings.audio.sample_rate,
        "chunk_ms": settings.audio.client_chunk_ms,
        "enroll_duration_sec": settings.enrollment.target_duration_sec,
        "min_speech_sec": settings.enrollment.min_speech_sec,
        "window_sec": settings.monitoring.window_sec,
        "hop_sec": settings.monitoring.hop_sec,
        "strikes_to_warn": settings.monitoring.strikes_to_warn,
        "cooldown_sec": settings.monitoring.cooldown_sec,
    }


@app.post("/enroll")
async def enroll_endpoint(
    audio: UploadFile = File(..., description="WAV/FLAC/OGG file, or raw PCM16 if sample_rate is given"),
    sample_rate: int | None = Form(None, description="Set only when uploading headerless PCM16"),
) -> JSONResponse:
    data = await audio.read()
    if len(data) > settings.server.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, detail={"code": "too_large", "message": "Audio upload too large."})
    try:
        wav = await asyncio.to_thread(decode_audio, data, settings.audio.sample_rate, sample_rate)
    except Exception as exc:  # noqa: BLE001 - any decoder failure is a client error
        raise HTTPException(400, detail={"code": "bad_audio", "message": f"Could not decode audio: {exc}"}) from exc
    finally:
        del data  # raw enrollment audio is never persisted

    bundle = models()
    try:
        result = await asyncio.to_thread(enroll, wav, bundle, settings)
    except EnrollmentError as e:
        return JSONResponse(status_code=422, content={"detail": {"code": e.code, "message": e.message, **e.details}})

    session = store.create(result, bundle)
    log.info("Enrolled session %s: thr=%.3f (mean=%.3f std=%.3f, %d segs, %.1fs speech)",
             session.id[:8], result.threshold, result.self_sim_mean, result.self_sim_std,
             result.n_segments, result.speech_sec)
    return JSONResponse({
        "session_id": session.id,
        "threshold": round(session.pipeline.threshold, 4),
        "enrolled_threshold": round(result.threshold, 4),
        "speech_sec": round(result.speech_sec, 2),
        "n_segments": result.n_segments,
        "self_similarity_mean": round(result.self_sim_mean, 4),
        "self_similarity_std": round(result.self_sim_std, 4),
    })


@app.get("/events/{session_id}")
async def get_events(session_id: str, include_windows: bool = Query(False)) -> dict[str, Any]:
    s = store.get(session_id)
    if s is None:
        raise HTTPException(404, detail={"code": "unknown_session", "message": "Session not found or already ended."})
    return s.report(include_windows=include_windows)


@app.post("/sessions/{session_id}/end")
async def end_session(session_id: str) -> dict[str, Any]:
    s = store.get(session_id)
    if s is None:
        raise HTTPException(404, detail={"code": "unknown_session", "message": "Session not found or already ended."})
    if s.websocket is not None:
        await _safe_close(s.websocket, WS_ENDED, "test ended")
    report = store.end(session_id)
    assert report is not None
    return report


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------
async def _safe_send(ws: WebSocket, payload: dict[str, Any]) -> bool:
    if ws.client_state != WebSocketState.CONNECTED:
        return False
    try:
        await ws.send_text(json.dumps(payload))
        return True
    except Exception:  # noqa: BLE001
        return False


async def _safe_close(ws: WebSocket, code: int, reason: str) -> None:
    with contextlib.suppress(Exception):
        if ws.client_state == WebSocketState.CONNECTED:
            await ws.close(code=code, reason=reason)


async def _process(session: Session, ws: WebSocket, queue: asyncio.Queue[bytes | None]) -> None:
    """Consume audio chunks, run the pipeline off the event loop, push results."""
    while True:
        item = await queue.get()
        if item is None:
            return
        chunks = [item]
        while not queue.empty():  # coalesce backlog to keep latency low
            nxt = queue.get_nowait()
            if nxt is None:
                queue.put_nowait(None)
                break
            chunks.append(nxt)
        audio = pcm16_bytes_to_float(b"".join(chunks))
        async with session.lock:
            results = await asyncio.to_thread(session.pipeline.push, audio)
            pending, session.pending = session.pending, []
        for ev in pending:
            await _safe_send(ws, ev)
        for r in results:
            ev = session.log_window(r)
            await _safe_send(ws, ev)


@app.websocket("/ws/monitor")
async def ws_monitor(ws: WebSocket, session_id: str = Query(...)) -> None:
    await ws.accept()
    session = store.get(session_id)
    if session is None:
        await _safe_send(ws, {"type": "error", "code": "unknown_session",
                              "message": "Unknown or ended session. Please enroll again."})
        await _safe_close(ws, WS_UNKNOWN_SESSION, "unknown session")
        return

    # Only one live stream per session: a reconnect replaces the old socket.
    if session.websocket is not None:
        await _safe_close(session.websocket, WS_REPLACED, "replaced by new connection")
    session.websocket = ws
    async with session.lock:
        session.pipeline.reset_stream()
    session.log_event("connected")
    cfg = settings.monitoring
    await _safe_send(ws, {
        "type": "ready",
        "threshold": round(session.pipeline.threshold, 4),
        "window_sec": cfg.window_sec, "hop_sec": cfg.hop_sec,
        "strikes_to_warn": cfg.strikes_to_warn, "cooldown_sec": cfg.cooldown_sec,
        "warnings_so_far": session.pipeline.tracker.warnings,
    })

    queue: asyncio.Queue[bytes | None] = asyncio.Queue()
    worker = asyncio.create_task(_process(session, ws, queue))
    reason = "disconnected"
    try:
        while True:
            msg = await ws.receive()
            if msg["type"] == "websocket.disconnect":
                break
            if msg.get("bytes") is not None:
                session.touch()
                await queue.put(msg["bytes"])
            elif msg.get("text") is not None:
                try:
                    data = json.loads(msg["text"])
                except json.JSONDecodeError:
                    continue
                if data.get("type") == "ping":
                    await _safe_send(ws, {"type": "pong", "t": data.get("t")})
                elif data.get("type") == "end":
                    reason = "ended"
                    break
    except WebSocketDisconnect:
        pass
    except Exception:  # noqa: BLE001
        log.exception("WebSocket error for session %s", session_id[:8])
    finally:
        await queue.put(None)
        with contextlib.suppress(Exception):
            await asyncio.wait_for(worker, timeout=5)
        if session.websocket is ws:
            session.websocket = None
            session.log_event("disconnected", reason=reason)
        if reason == "ended":
            report = store.end(session_id)
            await _safe_send(ws, {"type": "ended", "report": report})
            await _safe_close(ws, WS_ENDED, "test ended")


# ---------------------------------------------------------------------------
# Static frontend (optional convenience: open http://localhost:8000/).
# Mounted last so API/WS routes take precedence.
# ---------------------------------------------------------------------------
FRONTEND_DIR = PROJECT_ROOT / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


def run() -> None:  # pragma: no cover
    import uvicorn

    uvicorn.run("backend.app.main:app", host=settings.server.host, port=settings.server.port)


if __name__ == "__main__":  # pragma: no cover
    run()
