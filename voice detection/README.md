# VoiceGuard — Real-Time Multi-Voice Detection for Online Exams

VoiceGuard ensures exam integrity by verifying that **only the enrolled test taker**
is speaking. It continuously analyses microphone audio in real time and raises a
warning when another person's voice is detected.

![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.10%2B-blue)

---

## Features

| Feature | Description |
|---|---|
| **Voice enrollment** | ~20 s recording → VAD speech extraction → ECAPA-TDNN embeddings → normalised voice profile + auto threshold |
| **Real-time monitoring** | Streaming 16 kHz PCM over WebSocket, 2 s sliding window evaluated every 1 s |
| **Strike system** | 3 consecutive low-similarity windows → warning (with 10 s cooldown) |
| **Warning clips** | Short audio clip saved only when a warning fires (no other raw audio stored) |
| **Silent mic detection** | Server + client both detect a dead/muted microphone |
| **Auto-reconnect** | WebSocket auto-reconnect with exponential backoff |
| **Configurable** | Every threshold, timing, and model path in one `config.yaml` |
| **Offline test runner** | Feed WAV files through the same pipeline, print scores, sweep thresholds |

---

## Project Structure

```
voice detection/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app: REST + WebSocket endpoints
│   │   ├── config.py         # Typed settings from config.yaml (Pydantic)
│   │   ├── models.py         # Silero VAD + SpeechBrain ECAPA wrappers
│   │   ├── enrollment.py     # Build voice profile, compute threshold
│   │   ├── monitor.py        # Streaming MonitorPipeline + StrikeTracker
│   │   ├── sessions.py       # In-memory session store
│   │   └── audio.py          # Decode, resample, PCM conversion, clip I/O
│   └── __init__.py
├── frontend/
│   ├── index.html            # Single-page UI (consent → enroll → exam)
│   ├── app.js                # Mic capture, enrollment, WebSocket monitor
│   ├── pcm-worklet.js        # AudioWorklet: downsample → PCM16 chunks
│   └── styles.css            # Dark glassmorphism design system
├── tests/
│   ├── test_logic.py         # Unit tests (no models needed)
│   ├── run_scenarios.py      # Offline WAV scenario runner + threshold sweep
│   └── make_demo_tts.ps1     # Generate demo WAVs with Windows TTS voices
├── config.yaml               # Single source of truth for all settings
├── requirements.txt          # Python dependencies
└── README.md                 # ← you are here
```

---

## Quick Start

### 1. Prerequisites

- **Python 3.10+** (tested with 3.11 and 3.12)
- **pip** (or a virtual environment manager)
- A microphone and a modern browser (Chrome, Edge, or Firefox)

### 2. Install dependencies

```bash
cd "voice detection"
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
```

> **GPU (optional):** install the CUDA build of PyTorch *first*, then the rest:
> ```bash
> pip install torch==2.5.1 torchaudio==2.5.1 --index-url https://download.pytorch.org/whl/cu124
> pip install -r requirements.txt
> ```

### 3. Start the backend

```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

On first run the ECAPA model (~100 MB) is downloaded to `pretrained_models/`.
You'll see `Models ready (embeddings on cpu)` when the server is ready.

### 4. Open the frontend

Open **http://localhost:8000** in your browser. The frontend is served as static
files by FastAPI itself — no separate dev server needed.

> For HTTPS (required for microphone on non-localhost):
> ```bash
> python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 \
>     --ssl-keyfile key.pem --ssl-certfile cert.pem
> ```

---

## How It Works

### Enrollment Phase

1. User records ~20 seconds of speech by reading a displayed paragraph.
2. The browser captures audio via `AudioWorklet`, downsamples to 16 kHz mono
   PCM16, and sends ~250 ms chunks to the frontend buffer.
3. After recording, the audio is encoded as WAV and uploaded via `POST /enroll`.
4. Server-side:
   - **VAD** (Silero) removes silence, keeping only speech portions.
   - Speech is split into **2 s segments** with 50% overlap.
   - Each segment gets a **192-d embedding** (ECAPA-TDNN, SpeechBrain).
   - The **voice profile** = L2-normalised mean of all segment embeddings.
   - **Self-similarity** scores are computed (leave-one-out by default).
   - **Auto threshold** = `clip(mean − 3 × std, 0.25, 0.55)`.
5. If too little speech is detected, enrollment is rejected and the user retries.

### Monitoring Phase

1. Mic audio is streamed over **WebSocket** (`/ws/monitor`) as raw PCM16 chunks.
2. Server maintains a **sliding 2 s window**, evaluated every **1 s hop**.
3. For each window:
   - **VAD check**: if speech ratio < 40%, the window is skipped (silence).
   - **Embedding**: compute the window's speaker embedding.
   - **Cosine similarity** to the enrolled profile is calculated.
   - If similarity is **below threshold**: increment strike counter.
   - If similarity is **at or above threshold**: reset strikes (configurable).
4. After **3 consecutive strikes** → a **warning** is issued.
   - A short audio clip is saved as evidence.
   - An alert sound + red banner appear in the UI.
   - A **10 s cooldown** prevents warning spam.
5. Strike gaps > 4 s (e.g., separated by silence) don't count as consecutive.

---

## API Reference

### REST Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Server status, device, active sessions |
| `GET` | `/config/client` | Client-facing config values |
| `POST` | `/enroll` | Upload audio → create session, returns `session_id` + threshold |
| `GET` | `/events/{session_id}` | Warning log + session stats |
| `POST` | `/sessions/{session_id}/end` | End session, return report, wipe data |

### WebSocket

| Path | Query Params | Description |
|---|---|---|
| `ws://host:8000/ws/monitor` | `session_id` | Stream PCM16 audio chunks, receive similarity events |

**Inbound messages** (from client):
- Binary frames: raw PCM16 audio chunks
- `{"type": "ping", "t": <timestamp>}` — keep-alive
- `{"type": "end"}` — end the exam

**Outbound messages** (from server):
- `{"type": "ready", "threshold": ..., ...}` — connection established
- `{"type": "window", "similarity": ..., "status": ..., ...}` — per-window result
- `{"type": "warning", "similarity": ..., "clip_path": ..., ...}` — multi-voice warning
- `{"type": "silent_mic", ...}` — mic appears dead/muted
- `{"type": "mic_ok", ...}` — mic recovered
- `{"type": "ended", "report": {...}}` — session ended
- `{"type": "pong", "t": ...}` — keep-alive reply

---

## Configuration

All thresholds and timings are in [`config.yaml`](config.yaml). Key sections:

```yaml
enrollment:
  target_duration_sec: 20       # how long the UI records
  min_speech_sec: 8.0           # reject if less speech remains
  segment_sec: 2.0              # embedding window size
  threshold_std_factor: 3.0     # threshold = clip(mean - k*std, min, max)
  threshold_min: 0.25           # floor
  threshold_max: 0.55           # ceiling

monitoring:
  window_sec: 2.0               # analysis window
  hop_sec: 1.0                  # evaluate every hop
  min_speech_ratio: 0.40        # skip quiet windows
  strikes_to_warn: 3            # consecutive mismatches before warning
  cooldown_sec: 10.0            # minimum gap between warnings
  threshold_offset: 0.0         # added to auto threshold (+ve = stricter)
  silent_mic_sec: 15.0          # dead-mic alert after this long
```

Override the config path with the environment variable:
```bash
set VOICEGUARD_CONFIG=path\to\custom.yaml
```

---

## Testing

### Unit tests (no models, fast)

```bash
python -m pytest tests/test_logic.py -q
```

### Generate demo WAVs (Windows TTS)

```powershell
powershell -ExecutionPolicy Bypass -File tests\make_demo_tts.ps1
python -m tests.run_scenarios --data-dir data\demo --build ^
    --user-test data\demo\raw\user_test.wav --other data\demo\raw\other.wav
```

### Run offline scenario tests

```bash
python -m tests.run_scenarios --data-dir data\demo
```

This feeds four scenario WAVs through the same pipeline used by the WebSocket:
- **(a) user_only** — test taker only → expect 0 warnings
- **(b) alternating** — test taker + second speaker taking turns → expect ≥1 warnings
- **(c) overlap** — two people talking simultaneously → expect ≥1 warnings
- **(d) noise** — background noise/TV only → expect 0 warnings

The script also performs a **threshold sweep** showing the number of warnings at
different thresholds so you can pick the optimal value.

Use `--save-clips DIR` to save warning clips, or `--quiet` for summaries only.

---

## Tuning the Threshold & Reducing False Positives

The auto-computed threshold (`clip(mean − 3 × std, 0.25, 0.55)`) works well in
most environments, but you can fine-tune it:

### Strategy

1. **Run the offline test** with real recordings of yourself and another person.
2. Look at the **threshold sweep table** at the bottom of the output.
3. Pick the **highest threshold** where:
   - `user_only` stays at **0 warnings** (no false positives)
   - `noise` stays at **0 warnings**
   - `alternating` and `overlap` still produce **≥1 warnings** (true positives)

### Adjustments

| Problem | Fix |
|---|---|
| **Too many false positives** (warning when only you are speaking) | Decrease `threshold_offset` (e.g., `-0.05`) or increase `strikes_to_warn` to 4 |
| **Too many false negatives** (another voice not detected) | Increase `threshold_offset` (e.g., `+0.05`) or decrease `strikes_to_warn` to 2 |
| **Warnings from background noise** | Increase `min_speech_ratio` (e.g., `0.50`) so noisy-but-no-speech windows are skipped |
| **Warnings too slow** | Decrease `strikes_to_warn` to 2 (fires after 2 consecutive mismatches instead of 3) |
| **Warning spam** | Increase `cooldown_sec` (e.g., `15.0` or `20.0`) |
| **Enrollment keeps failing** | Lower `min_speech_sec` (e.g., `5.0`); make sure the user speaks clearly |

### Config knobs (in `config.yaml`)

```yaml
monitoring:
  threshold_offset: -0.05       # negative = fewer false positives
  strikes_to_warn: 3            # 2 = faster detection, more sensitive
  min_speech_ratio: 0.40        # raise to 0.50 to ignore noisy windows
  cooldown_sec: 10.0            # raise to reduce warning frequency
```

---

## Architecture Notes

- **Models are loaded once** per process and shared across all sessions (thread-safe).
- **Silero VAD** runs on CPU (tiny model, faster than GPU round-trips).
- **ECAPA embeddings** run on CUDA if available, otherwise CPU.
- **Per-session state** (profile, buffer, strikes, cooldown, event log) is held in memory.
  When the test ends or times out, all data is wiped.
- **No raw audio is stored** except warning clips (configurable, can be auto-deleted).
- The frontend uses `AudioWorklet` for low-latency, off-main-thread audio capture.
  It applies a cascaded biquad low-pass filter before decimation to prevent aliasing.
- WebSocket sends binary PCM16 frames to minimize bandwidth and latency.

---

## Troubleshooting

| Issue | Solution |
|---|---|
| "Models are still loading" | Wait ~30 s for the ECAPA model to download/load on first run |
| Microphone permission denied | Allow microphone in browser settings; use HTTPS on non-localhost |
| WebSocket disconnects frequently | Check firewall/proxy settings; the client auto-reconnects |
| `SymbolicLinkError` on Windows | Already handled — SpeechBrain downloads use `LocalStrategy.COPY` |
| High CPU during monitoring | Each window evaluation takes ~50–200 ms on CPU. For many concurrent sessions, use a GPU |

---

## License

MIT
