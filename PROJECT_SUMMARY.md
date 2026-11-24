# Project Summary: Proctortrack Online Examination & AI Proctoring Platform

> **Location:** Root directory (`/Major/PROJECT_SUMMARY.md`)  
> **Status:** Full-Stack Integrated & Live (Frontend + Backend + PostgreSQL + WebSocket STOMP + Gaze Detection + VoiceGuard Audio + Dual-Camera WebRTC)  
> **Last Updated:** November 2026  

---

## 📌 Executive Overview
**Proctortrack** is an enterprise-grade, full-stack online examination and automated AI proctoring platform engineered with a strict dual-role workflow:
1. **Students:** An anti-cheating, lockdown assessment environment supporting both Multiple-Choice Questions (MCQ) and interactive coding sandboxes, complete with automated scoring, persistent sessions, network interruption grace recovery, real-time gaze tracking, dual-camera mobile monitoring, multi-speaker voice detection, and multi-tier malpractice safeguards.
2. **Invigilators / Admins:** A centralized live monitoring command center featuring real-time telemetry KPI cards, interactive malpractice trend graphs, categorized violation breakdowns, active exam tracking, on-demand dual-camera feeds, automated audio & visual infraction detection, and WebSocket-driven risk updates.

---

## 🏗 Tech Stack & Architecture

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, Lucide React, WebSocket / SockJS STOMP Client, WebRTC P2P, Pure CSS Design System (Custom Glassmorphism, Dark/Light Mode Tokens) |
| **Backend** | Java 25 / 21, Spring Boot 4.1.1, Spring Data JPA, Hibernate ORM 7.4.5, Spring WebSocket & STOMP Message Broker (10MB/20MB Buffers), HikariCP Connection Pooling, Maven |
| **Database** | PostgreSQL 18+ (`proctoring_db`) with Hibernate schema validation & migration |
| **AI / Gaze Estimation** | Python 3.11, FastAPI, Uvicorn, MediaPipe Face Landmarker (478 iris & facial mesh landmarks), PyTorch, Torchvision, L2CS-Net ResNet-50 Gaze360 (`safetensors`), OpenCV, Scikit-learn |
| **AI / Voice & Audio** | Python 3.11, FastAPI, Uvicorn, Silero VAD (Voice Activity Detection), SpeechBrain ECAPA-TDNN (`spkrec-ecapa-voxceleb` speaker embeddings), Web Audio API Normalized Autocorrelation ($F_0$ Pitch Tracking) |
| **Dual-Camera System** | WebRTC Peer-to-Peer, STOMP Signaling, WebSocket Base64 JPEG Fallback (8 FPS), Screen Wake Lock API, Offline QR Code Generation |
| **Security & Proctoring** | Fullscreen API, Page Visibility API, Network Offline/Online API, Clipboard lockdown, AI/ML risk scoring engine (0–100 scale) with real-time escalation |
| **Configuration** | Centralized `.env` and `.env.example` supporting custom ports, resilient pool settings, and dynamic API endpoints |

---

## 🌐 Running Services & Port Mappings

| Service | Host & Port | Status | Protocol / Framework | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Web App** | `https://localhost:5173` | 🟢 Active | React 19 + Vite 8 SPA (HTTPS / SSL) | Candidate Exam Portal & Invigilator Dashboard |
| **Backend Core API** | `http://localhost:8080` | 🟢 Active | Spring Boot 4.1.1 (Java 25) | REST Endpoints, Database JPA, STOMP Broker |
| **Gaze Detection Microservice** | `http://localhost:5001` | 🟢 Active | FastAPI + Uvicorn (Port 5001) | L2CS-Net Gaze Estimation & Head Pose |
| **VoiceGuard Microservice** | `http://localhost:8000` | 🟢 Active | FastAPI + Uvicorn (Port 8000) | Silero VAD + ECAPA-TDNN Speaker Verification |
| **Database Server** | `localhost:5432` | 🟢 Active | PostgreSQL 18 (`proctoring_db`) | Relational Data, Submissions, Violations |

---

## 🌟 Major System Enhancements (Implemented Post-Gaze Detection)

The following comprehensive features and architectural upgrades were engineered, verified, and integrated following the initial gaze detection pipeline:

### A. Dual-Camera Proctoring System (Laptop Webcam + Mobile Phone)
1. **Dynamic Session-Specific Mobile Pairing**:
   - Backend pairing token generation (`POST /api/mobile-pairing/generate` and `MobilePairingToken` entity) with cryptographically secure session tokens and automatic expiry.
   - Standalone, zero-install mobile web application served at `/mobile-camera?token=...`, specifically optimized for smartphone displays and touch interaction.
   - Offline QR Code generation (`qrcode` library) rendered directly in the candidate interface without external third-party network dependencies.
2. **Dual-Transport Video Pipeline (WebRTC P2P + WebSocket Frame Fallback)**:
   - **Primary WebRTC P2P Channel**: Employs Spring Boot STOMP signaling (`/app/webrtc/{sessionId}/*` and `/topic/webrtc/{sessionId}/*`) to establish direct peer-to-peer video streaming.
   - **Guaranteed WebSocket Fallback Channel**: On restricted cellular networks, mobile hotspots, or firewalled NATs where public STUN fails, the mobile phone continuously streams canvas-compressed JPEG frames (~8 FPS, 320x240, quality 0.40) over `/app/webrtc/{sessionId}/frame`.
   - **Zero-Blackout Layered Display**: The candidate panel (`MobileCameraPanel.jsx`) and proctor modal (`MobileCameraFeed.jsx`) layer the fallback image on `zIndex: 2` beneath the WebRTC video on `zIndex: 3`, ensuring unbroken video feed under all network conditions.
   - Expanded backend WebSocket message limits to **10MB** and transport send buffers to **20MB** in `WebSocketConfig.java` to prevent socket throttling under high-throughput video streaming.
3. **iOS Safari & Mobile Hardware Stability Fixes**:
   - **Eliminated WebRTC Renegotiation Loops**: Removed `fallbackFrame` from the WebRTC `useEffect` dependency array, stopping the laptop from destroying and recreating WebRTC peer connections 10 times a second.
   - **Eliminated React Re-Render Storm**: Replaced `frameCount` component state with mutable `framesSentRef`, preventing high-frequency React re-renders from starving the mobile device's CPU.
   - **Prevented AVFoundation Hardware Shutdown**: iOS Safari's media engine terminates the camera track if video transceivers churn rapidly. Enforced a single WebRTC initialization per session and cleanly initialized DOM attributes (`playsinline`, `webkit-playsinline`, `muted`, `defaultMuted`) before calling `.play()`.
   - **Screen Wake Lock API**: Incorporated `navigator.wakeLock.request('screen')` so the phone screen never dims or locks during the examination.
   - **Mobile UI Status Bar**: Added live status indicators displaying pulsing green `LIVE STREAMING` badges and camera flip controls.

---

### B. VoiceGuard & Real-Time Multi-Voice Detection Engine
1. **VoiceGuard Deep Learning Microservice (`voice detection/`, Port 8000)**:
   - Built on FastAPI with **Silero VAD** for voice activity detection and **SpeechBrain ECAPA-TDNN** (`spkrec-ecapa-voxceleb`) for 192-dimensional speaker embeddings.
   - Exposes REST endpoints (`/enroll`, `/health`, `/config/client`, `/events/{id}`) and WebSocket streaming (`/ws/monitor`).
   - Evaluates candidate voice profile embeddings against streaming chunks, identifying foreign speaker intrusion via cosine distance thresholding.
2. **In-Browser Edge Multi-Voice Detection Engine ([`voiceAnalysis.js`](file:///c:/Major/frontend/src/services/voiceAnalysis.js))**:
   - **Normalized Time-Domain Autocorrelation ($R(\tau)/R(0)$)**: Replaced flawed FFT magnitude peak picking with normalized time-domain autocorrelation across candidate pitch lags (80 Hz to 350 Hz). Accurately isolates fundamental vocal pitch ($F_0$) without interference from louder vowel formants ($F_1/F_2$ at 600–1800 Hz).
   - **Polyphonic Dual-Pitch Overlap Detection**: Detects simultaneous secondary correlation peaks ($>0.35$ confidence) with pitch deltas $>38$ Hz (excluding octave harmonics), catching two people talking at the same time.
   - **Conversational Pitch Dispersion Tracking**: Computes standard deviation and pitch span over a sliding window. Normal single-speaker pitch variance is $<18$ Hz; conversational turn-taking results in std dev $>26$ Hz and pitch span $>50$ Hz, triggering strikes.
   - **Microphone Lifecycle Synchronization**: Unified media stream requests in [`CameraPreview.jsx`](file:///c:/Major/frontend/src/components/exam/CameraPreview.jsx) to acquire both video and audio in a single prompt, triggering `VoiceMonitor` through reactive `hasAudioTrack` state.
   - **Dynamic Equalizer Meter**: Calibrated dBFS volume mapping (-55 to -10 dBFS) powering the 4-bar equalizer on the candidate card, displaying `Quiet`, `Voice Normal` (green), and `Multiple Voices` (red).
3. **Security Policy & Risk Penalties**:
   - Added `MULTIPLE_VOICES`, `VOICE_WARNING`, `AUDIO_WARNING`, and `SILENT_MIC` events to backend `RiskScoringService.java` (+15 points penalty) and `ProctoringEventService.java` (`high` severity).
   - Integrated live audio violation badges on the proctor dashboard (`LiveMonitoring.jsx`).

---

### C. Client-Side Browser Fallbacks & CV Enhancements
1. **In-Browser MediaPipe Face Mesh Fallback**:
   - When the Python gaze microservice (port 5001) is offline or unreachable, [`CameraPreview.jsx`](file:///c:/Major/frontend/src/components/exam/CameraPreview.jsx) automatically falls back to client-side MediaPipe landmark estimation.
   - Extracts 478 face and iris landmarks in real time inside the browser, calculating head pitch, yaw, roll, and eye deviation with zero backend dependency.
2. **Calibrated Bezel Camera Geometry**:
   - Calibrated vertical pitch angle normalization for standard laptop screen bezel camera placements (valid forward gaze between -18° and +8°), eliminating false positives from natural screen reading angles.
3. **Inactivity & Multiple Face Enforcement**:
   - `MULTIPLE_FACES` flags immediate high-risk infractions if a secondary person appears in the camera frame.
   - `LONG_INACTIVITY` triggers after extended absence of candidate interaction, warning the student and notifying proctors.

---

### D. End-to-End Lockdown, Scoring & Live Invigilation Upgrades
1. **Automated Exam Scoring Engine**:
   - Implemented `calculateExamScore()` in `StudentExam.jsx` to dynamically evaluate submissions across MCQs (against `correctIndex`) and coding problems, displaying instant percentage scorecards and performance analytics upon submission.
2. **Strict Multi-Tier Violation Enforcement**:
   - **Tab Switching**: Auto-terminates upon reaching 3 recorded infractions.
   - **Fullscreen Exits**: Fullscreen lock enforcement catches Escape/Alt-Tab attempts; auto-disqualifies upon 3 infractions.
   - **Cumulative Risk Score Auto-Submit**: Reaching $\ge 80$ risk points triggers immediate auto-termination with reason `CHEATING_RISK_THRESHOLD_REACHED`.
3. **Live Invigilation Dynamic Attempt Lifecycle**:
   - Replaced static demo seeds with dynamic attempt endpoints: `POST /api/candidates/start-attempt`, `POST /api/candidates/update-progress`, and `POST /api/candidates/end-attempt`.
   - `GET /api/candidates/live` filters strictly for currently active students, keeping the invigilator dashboard uncluttered.
4. **On-Demand Camera Monitoring**:
   - Optimized bandwidth by replacing perpetual video streams for all students with on-demand video feeds and modal inspection (`CandidateDetailModal.jsx`).

---

### E. Infrastructure, Buffer Expansion & Network Resilience
1. **Network Interruption Grace Period**:
   - Implemented an intelligent **10-second countdown grace period** upon browser disconnection (`window.onoffline`).
   - If connectivity restores within 10 seconds, penalties are waived and telemetry flushes automatically. Disconnections exceeding 10 seconds record a `NETWORK_INTERRUPTION` penalty (+3 points).
2. **Database Connection Resilience (HikariCP)**:
   - Configured robust connection pooling parameters in `application.properties` (`max-lifetime=1800000`, `keepalive-time=30000`, `connection-timeout=20000`), preventing stale connection drops when host machines sleep or switch networks.
3. **HTTPS / TLS Configuration via Vite**:
   - Configured `@vitejs/plugin-basic-ssl` to serve the frontend over HTTPS (`https://localhost:5173/`), ensuring modern browsers grant camera and microphone access.
4. **Full Reverse Proxy Mapping in `vite.config.js`**:
   - `/api` $\rightarrow$ `http://localhost:8080` (Spring Boot REST)
   - `/ws-proctor` $\rightarrow$ `http://localhost:8080` (STOMP WebSockets)
   - `/gaze-api` $\rightarrow$ `http://localhost:5001` (Gaze Detection Server)
   - `/voice-api` $\rightarrow$ `http://localhost:8000` (VoiceGuard REST Server)
   - `/ws-voice` $\rightarrow$ `ws://localhost:8000/ws/monitor` (VoiceGuard Audio WebSocket)

---

## 📁 Updated Project Directory Structure
```
Major/
├── PROJECT_SUMMARY.md       <-- (This file: comprehensive record of system state)
├── README.md                <-- Setup guide, quick start, and demo credentials
├── .env                     <-- Unified environment variables
├── backend/                 <-- Spring Boot 4.1.1 Java 25 Backend
│   ├── src/main/java/com/proctoring/proctoring_backend/
│   │   ├── config/          (WebConfig, DatabaseSeeder, WebSocketConfig)
│   │   ├── controller/      (AuthController, CandidateController, ExamController, WebRtcSignalingController, MobilePairingController, etc.)
│   │   ├── dto/             (StartSessionRequest, SessionResponse, ProctoringEventRequest, RiskSummary, etc.)
│   │   ├── entity/          (Candidate, Exam, Question, ExamSubmission, ExamSession, ProctoringEvent, Violation, MobilePairingToken, User)
│   │   ├── repository/      (CandidateRepository, ExamRepository, ProctoringEventRepository, ViolationRepository, MobilePairingTokenRepository, etc.)
│   │   └── service/         (ExamSessionService, ProctoringEventService, RiskScoringService)
│   ├── src/test/java/       (NetworkInterruptionProctoringTest, RiskScoringServiceTest, ProctoringBackendApplicationTests)
│   ├── src/main/resources/  (application.properties)
│   ├── mvnw / mvnw.cmd      (Maven wrapper scripts)
│   └── pom.xml
├── frontend/                <-- React 19 + Vite 8 Web Application (HTTPS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/        (ProtectedRoute)
│   │   │   ├── common/      (UserAvatar, RiskBadge, StatusBadge, SearchBar, EmptyState, Modal, LoadingSpinner)
│   │   │   ├── dashboard/   (ActiveCandidates, ActiveExamsCard, RecentMalpracticesGraph, MalpracticeBreakdown, QuickActions, RecentViolations, StatCard)
│   │   │   ├── exam/        (QuestionCard, QuestionNavigator, SecurityViolationModal, NetworkInterruptionBanner, CameraPreview, MobileCameraPanel, VoiceMonitorPanel, ExamTimer)
│   │   │   ├── layout/      (AppLayout, Navbar, Sidebar)
│   │   │   └── monitoring/  (CandidateMonitorCard, CandidateDetailModal, MobileCameraFeed, CameraPlaceholder, MonitoringTimeline)
│   │   ├── pages/           (Dashboard, LiveMonitoring, StudentExam, MobileCameraPage, StudentPortal, AttemptedExams, Exams, Students, Reports, Settings)
│   │   ├── services/        (api.js, auth.js, examSecurity.js, gazeAnalysis.js, voiceAnalysis.js, mobileCamera.js, mobilePeer.js, studentExams.js, websocket.js)
│   │   └── index.css        (Global design tokens, avatar styles, layout utilities)
│   ├── package.json
│   └── vite.config.js       (SSL + Proxy routes for /api, /ws-proctor, /gaze-api, /voice-api, /ws-voice)
├── gaze_detection/          <-- Real-Time Gaze Estimation & AI Microservice (Port 5001)
│   ├── .venv/               (Isolated Python 3.11 virtual environment)
│   ├── models/
│   │   ├── face_landmarker.task             (MediaPipe Face Landmarker model)
│   │   └── l2cs_net/
│   │       └── l2cs_gaze360_resnet50.safetensors (L2CS-Net ResNet-50 Gaze360 weights)
│   ├── server.py            (FastAPI Uvicorn API server on port 5001)
│   ├── gaze_model.py        (L2CS-Net ResNet-50 inference engine)
│   ├── landmarks.py         (MediaPipe 478 face and iris landmark detector)
│   ├── head_pose.py         (Head yaw/pitch/roll estimator via solvePnP)
│   └── requirements.txt     (Python dependencies)
└── voice detection/         <-- VoiceGuard Multi-Voice Detection Microservice (Port 8000)
    ├── .venv/               (Python 3.11 environment with SpeechBrain & PyTorch)
    ├── backend/
    │   └── app/
    │       ├── main.py      (FastAPI server exposing /enroll, /health, /ws/monitor)
    │       ├── models.py    (Silero VAD + SpeechBrain ECAPA-TDNN embedder)
    │       ├── enrollment.py(Voice profile feature extractor & threshold calculator)
    │       ├── monitor.py   (Sliding window similarity evaluator)
    │       └── sessions.py  (In-memory session store & reporting)
    ├── pretrained_models/   (Local offline model cache for ECAPA-TDNN)
    ├── config.yaml          (VAD, enrollment durations, and threshold parameters)
    └── requirements.txt
```

---

## 🔑 Demo Credentials

| Role | Username / ID | Password | Access Portal |
| :--- | :--- | :--- | :--- |
| **Student** | `STU001` (or any `STU*` ID) | `student123` | [https://localhost:5173/student-login](https://localhost:5173/student-login) |
| **Invigilator / Admin** | `admin` | `admin123` | [https://localhost:5173/invigilator-login](https://localhost:5173/invigilator-login) |


---

## 9. Student-Wise Logs & Multiple Faces Evidence Screenshot Capture

### 9.1 Overview & Architecture
To empower invigilators and academic committees with indisputable evidence during exams, the platform now automatically captures webcam photo snapshots the exact second multiple faces are detected, and organizes all proctoring telemetry student-by-student in the Admin Dashboard.

### 9.2 Key Capabilities Added:
1. **Instant Camera Snapshot on Multiple Faces Detection:**
   - Whenever the primary webcam detects more than one face (`MULTIPLE_FACES` or `face_count > 1`), a canvas frame snapshot (`image/jpeg`, base64) is captured instantly from the live camera feed.
   - Throttled intelligently to prevent flooding while ensuring every distinct multi-face incident is visually recorded.
2. **Backend Biometric Snapshot Persistence:**
   - Both `proctoring_events` and `violations` tables in PostgreSQL feature a dedicated `snapshot TEXT` column.
   - `ProctoringEventRequest`, `ProctoringEventResponse`, and `Violation` entities serialize and store the base64 screenshot evidence.
3. **Student-Wise API Endpoints:**
   - `GET /api/candidates/{candidateId}/events`: Returns chronological events and snapshots for any candidate.
   - `GET /api/students/{studentId}/events`: Alias endpoint for student roster audit log retrieval.
   - `GET /api/violations/candidate/{candidateId}`: Returns filtered violations for candidate.
4. **Admin Dashboard Student-Wise Evidence UI:**
   - **`EvidenceSnapshotModal.jsx`**: An enlarged high-resolution inspection modal with zoom in/out, candidate details, timestamp, risk penalty, and 1-click evidence download.
   - **`StudentAuditLogModal.jsx`**: A dedicated filterable modal (All Logs, Multiple Faces Only, High Severity, Voice Infractions) accessible with 1 click from the Candidate Directory (`/students`).
   - **`StudentWiseLogsCard.jsx`**: Placed directly on the main Invigilator Dashboard (`/dashboard`) allowing invigilators to filter by candidate and review multiple face detection snapshots on demand.
   - **`CandidateDetailModal.jsx` & `MonitoringTimeline.jsx`**: Enhanced with direct evidence thumbnails and `[📸 View Multiple Faces Photo]` buttons during live monitoring.
