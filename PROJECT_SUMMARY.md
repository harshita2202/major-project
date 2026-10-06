# Project Summary: Proctortrack Online Examination & AI Proctoring Platform

> **Location:** Root directory (`/Major/PROJECT_SUMMARY.md`)  
> **Status:** Full-Stack Integrated & Live (Frontend + Backend + PostgreSQL + WebSocket STOMP + Gaze Detection ML Service)  
> **Last Updated:** October 2026  

---

## 📌 Executive Overview
**Proctortrack** is an enterprise-grade, full-stack online examination and automated AI proctoring platform engineered with a strict dual-role workflow:
1. **Students:** An anti-cheating, lockdown assessment environment supporting both Multiple-Choice Questions (MCQ) and interactive coding sandboxes, complete with automated scoring, persistent sessions, network interruption grace recovery, real-time gaze tracking, and multi-tier malpractice safeguards.
2. **Invigilators / Admins:** A centralized live monitoring command center featuring real-time telemetry KPI cards, interactive malpractice trend graphs, categorized violation breakdowns, active exam tracking, on-demand camera feeds, automated infraction detection, and WebSocket-driven risk updates.

---

## 🏗 Tech Stack & Architecture

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, Lucide React, WebSocket / SockJS STOMP Client, Pure CSS Design System (Custom Glassmorphism, Dark/Light Mode Tokens) |
| **Backend** | Java 25 / 21, Spring Boot 4.1.1, Spring Data JPA, Hibernate ORM 7.4.5, Spring WebSocket & STOMP Message Broker, HikariCP Connection Pooling, Maven |
| **Database** | PostgreSQL 18+ (`proctoring_db`) with Hibernate schema validation & migration |
| **AI / Gaze Estimation** | Python 3.11, FastAPI, Uvicorn, MediaPipe Face Landmarker (478 iris & facial mesh landmarks), PyTorch, Torchvision, L2CS-Net ResNet-50 Gaze360 (`safetensors`), OpenCV, Scikit-learn |
| **Security & Proctoring** | Fullscreen API, Page Visibility API, Network Offline/Online API, Clipboard lockdown, AI/ML risk scoring engine (0–100 scale) with real-time escalation |
| **Configuration** | Centralized `.env` and `.env.example` supporting custom ports, resilient pool settings, and dynamic API endpoints |

---

## 🌐 Running Services & Port Mappings

| Service | Host & Port | Status | Protocol / Framework |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | `http://localhost:5173` | 🟢 Active | React 19 + Vite 8 SPA |
| **Backend Core API** | `http://localhost:8080` | 🟢 Active | Spring Boot 4.1.1 (Java 25) |
| **Gaze Detection Microservice** | `http://localhost:5001` | 🟢 Active | FastAPI + Uvicorn (L2CS-Net + MediaPipe) |
| **Database** | `localhost:5432` | 🟢 Active | PostgreSQL (`proctoring_db`) |

---

## 🚀 Key Features & Architectural Capabilities

### 1. Real-Time Gaze Detection & Computer Vision Pipeline (`gaze_detection/`)
- **FastAPI ML Microservice ([`server.py`](file:///c:/Major/gaze_detection/server.py))**:
  - Independent Python 3.11 microservice running on port `5001` exposing `/health` and `/analyze` endpoints.
  - Implements CORS middleware allowing cross-origin webcam frame ingestion from the Vite client.
- **Dual-Model Gaze & Face Estimation Pipeline**:
  - **MediaPipe Face Landmarker ([`landmarks.py`](file:///c:/Major/gaze_detection/landmarks.py) & `face_landmarker.task`)**: High-accuracy landmark detection extracting 478 points, including eye contours and dual iris centers.
  - **L2CS-Net Deep Learning Gaze Estimator ([`gaze_model.py`](file:///c:/Major/gaze_detection/gaze_model.py))**: Pretrained ResNet-50 backbone with Gaze360 weights loaded via `safetensors` (`l2cs_gaze360_resnet50.safetensors`, 95.7 MB). Classifies gaze angles across 90 bins covering pitch and yaw in continuous radians.
  - **Geometric Fallback ([`eye_crop.py`](file:///c:/Major/gaze_detection/eye_crop.py))**: Automatic fallback estimator based on iris center offset if GPU/neural weights are unavailable.
  - **Head Pose Estimation ([`head_pose.py`](file:///c:/Major/gaze_detection/head_pose.py))**: Evaluates yaw, pitch, and roll via `cv2.solvePnP` to detect head rotation and looking away from screen.
- **Malpractice Detection & Suspicion Logic**:
  - Evaluates consecutive off-center gaze frames and head deviations (e.g., yaw > 30° or pitch > 25°).
  - Flags `is_suspicious = true` with dynamic suspicion score (0.0 to 1.0) and descriptive warnings (*"Suspicious: Head turned away"*, *"Suspicious: Looking away"*).
- **Frontend Camera Feed Integration ([`CameraPreview.jsx`](file:///c:/Major/frontend/src/components/exam/CameraPreview.jsx) & [`gazeAnalysis.js`](file:///c:/Major/frontend/src/services/gazeAnalysis.js))**:
  - Web camera feed dynamically samples frames and dispatches base64 payloads to `http://localhost:5001/analyze`.
  - Gracefully falls back to standby if camera permissions are denied or service is offline.
  - Fixed duplicate line syntax issue in `gazeAnalysis.js` to ensure clean build output.

---

### 2. Calibrated Risk Scoring & Malpractice Penalty Engine
- **Proportional Event Penalties ([`RiskScoringService.java`](file:///c:/Major/backend/src/main/java/com/proctoring/proctoring_backend/service/RiskScoringService.java))**:
  - Fine-tuned risk penalty distribution to balance deterrence without unwarranted rapid disqualification:
    | Malpractice / Telemetry Event | Points | Severity Classification |
    | :--- | :---: | :--- |
    | `NETWORK_INTERRUPTION` / `NETWORK_DISCONNECTION` | **+3** | Low (Grace period protected) |
    | `LONG_INACTIVITY` / `INACTIVITY` | **+5** | Low |
    | `SHORTCUT_ATTEMPT` / `KEYBOARD_SHORTCUT` | **+5** | Medium (Blocked action) |
    | `GAZE_WARNING` / `GAZE` | **+8** | Medium (Gaze / head deviation) |
    | `FULLSCREEN_EXIT` | **+10** | High (Window containment break) |
    | `TAB_SWITCH` | **+15** | High (Loss of exam focus) |
    | `COPY_ATTEMPT` / `CUT_ATTEMPT` | **+20** | High (Direct integrity violation) |
    | `PASTE_ATTEMPT` / `CLIPBOARD_PASTE_ATTEMPT` | **+20** | High (Direct integrity violation) |
- **Cumulative Risk Tiers**:
  - **Low Risk (0–49 pts)**: Standard monitoring status.
  - **Medium Risk (50–79 pts)**: Triggers prominent on-screen warning modals in student portal.
  - **High Risk (80+ pts)**: Automatic exam termination and candidate disqualification with reason `CHEATING_RISK_THRESHOLD_REACHED`.

---

### 3. Network Interruption & Offline Resilience Architecture
- **Grace Period Protection ([`NetworkInterruptionBanner.jsx`](file:///c:/Major/frontend/src/components/exam/NetworkInterruptionBanner.jsx) & [`StudentExam.jsx`](file:///c:/Major/frontend/src/pages/StudentExam.jsx))**:
  - Implemented an intelligent **10-second countdown grace period** upon browser network disconnect (`window.onoffline`), preventing unfair immediate penalties for transient WiFi drops or router handshakes.
  - While offline within the grace period, an amber sticky banner alerts the student with live second-by-second countdowns and instructions to restore connectivity.
- **Rule-Based Penalty Allocation**:
  - If network disconnection persists beyond 10 seconds, `triggerNetworkInterruptionViolation()` records a `NETWORK_INTERRUPTION` penalty (+3 risk points).
  - The status badge transitions from amber grace to red: `"Offline · Penalty Recorded"`.
- **Deferred Event Sync & Auto-Recovery**:
  - When connection is restored (`window.ononline`), the timer clears, and a dismissible green toast confirms: *"Network connection restored. You may continue the exam."*
  - Any pending offline infraction telemetry unable to dispatch while disconnected is buffered locally and automatically flushed to the backend via `recordExamEvent()`.
- **Real-Time WebSocket Ingestion ([`ProctoringEventService.java`](file:///c:/Major/backend/src/main/java/com/proctoring/proctoring_backend/service/ProctoringEventService.java))**:
  - Network interruption events are stored in PostgreSQL (`proctoring_events` and `violations` tables) and broadcasted in real-time over `/topic/examiner/risk-updates` and `/topic/events` to proctors.
- **Developer / Evaluator Testing Utilities**:
  - Window helpers (`window.__simulateOffline` and `window.__simulateOnline`) and Vite DEV mode inline simulation buttons enable instant offline/online testing without unplugging physical network adapters.

---

### 4. Invigilator & Admin Command Center
- **Interactive Analytics & Malpractice Visualizations ([`Dashboard.jsx`](file:///c:/Major/frontend/src/pages/Dashboard.jsx))**:
  - **Malpractice Breakdown Card ([`MalpracticeBreakdown.jsx`](file:///c:/Major/frontend/src/components/dashboard/MalpracticeBreakdown.jsx))**: Categorized distribution of violations across Tab Switching, Fullscreen Exits, Clipboard Misuse, Network Drops, and Gaze Deviations.
  - **Recent Malpractices Trend Graph ([`RecentMalpracticesGraph.jsx`](file:///c:/Major/frontend/src/components/dashboard/RecentMalpracticesGraph.jsx))**: Hourly/daily chronological violation distribution graph visualizing security incident surges over time.
  - **Active Exams Live Card ([`ActiveExamsCard.jsx`](file:///c:/Major/frontend/src/components/dashboard/ActiveExamsCard.jsx))**: Displays currently running assessments, active candidate headcounts, countdown timers, and direct jump buttons to live invigilation.
  - **Quick Actions Bar ([`QuickActions.jsx`](file:///c:/Major/frontend/src/components/dashboard/QuickActions.jsx))**: One-click actions for invigilators to schedule examinations, launch live camera monitors, review audit logs, and trigger system health cleanups.
  - **Recent Violations Feed ([`RecentViolations.jsx`](file:///c:/Major/frontend/src/components/dashboard/RecentViolations.jsx))**: Real-time event log featuring student avatars, severity badges (`High`, `Medium`, `Low`), exact timestamps, and modal review triggers.

---

### 5. Dynamic Exam Scoring & Real-Time Auto-Termination
- **Automated Score Evaluation ([`StudentExam.jsx`](file:///c:/Major/frontend/src/pages/StudentExam.jsx))**:
  - Implemented `calculateExamScore()` to dynamically evaluate student submissions across both MCQs (comparing answers against `correctIndex`) and coding challenges.
  - Eliminated hardcoded `score: 0` submissions; the submission screen provides an instant, accurate scorecard displaying percentage, answered count, and performance breakdown.
- **Strict Multi-Tier Violation Enforcement**:
  - **Tab Switching**: Immediate warning modals on tab switches or browser blur; auto-terminates upon reaching the threshold (**3 infractions**).
  - **Fullscreen Exits**: Fullscreen enforcement catches Esc / Alt-Tab exits; triggers auto-disqualification upon **3 infractions**.
  - **Cumulative ML Risk Scoring**: Real-time telemetry evaluates events via backend `RiskScoringService`. Exceeding the high-risk threshold (**&ge; 80 points**) immediately auto-terminates the examination.
- **Persistent Audit Logging**:
  - Endpoints update the student's status to `submitted`, `time_expired`, or `terminated` / `disqualified`, persisting records across `ExamSubmissionRepository` and `CandidateRepository`.

---

### 6. Live Invigilation: Real-Time Active Attempt Tracking
- **Complete Removal of Hardcoded Dummy Candidates**:
  - Purged static demo seeds (`cand-1`, `cand-2`, etc.) from `DatabaseSeeder.java` and `mockData.js`.
  - Added an automatic database cleanup mechanism on startup to eliminate stale dummy entries.
- **Dynamic Attempt Lifecycle ([`StudentExam.jsx`](file:///c:/Major/frontend/src/pages/StudentExam.jsx) & [`CandidateController.java`](file:///c:/Major/backend/src/main/java/com/proctoring/proctoring_backend/controller/CandidateController.java))**:
  - **Exam Start**: When a student clicks *"Start Examination"* or enters an active exam, `startExamAttempt()` dispatches `POST /api/candidates/start-attempt` with real candidate credentials and exam metadata.
  - **Progress Sync**: An active background sync effect periodically streams answered counts, completion percentages, and countdown timers to the backend via `POST /api/candidates/update-progress`.
  - **Exam Completion / Disqualification**: Submitting or being disqualified triggers `endExamAttempt()`, updating candidate status to `completed` or `disqualified`.
- **Live Filtering**:
  - `GET /api/candidates/live` returns **only** candidates with `status = "active"`, automatically filtering out finished students and dummy IDs.
  - When no students are taking exams, the Live Invigilation page displays a clean empty state: *"No Students Currently Attempting Exams."*
- **Real-Time Polling & Reactivity ([`LiveMonitoring.jsx`](file:///c:/Major/frontend/src/pages/LiveMonitoring.jsx))**:
  - Equipped with background polling (every 3 seconds), window focus listeners, and cross-tab storage synchronizers so newly attempting students appear immediately without requiring manual page reloads.

---

### 7. On-Demand Camera Feeds & Bandwidth Optimization
- **Bandwidth & Performance Fix**:
  - Replaced simultaneous live video streaming for every student with **on-demand monitoring**.
  - In [`ActiveCandidates.jsx`](file:///c:/Major/frontend/src/components/dashboard/ActiveCandidates.jsx): Displays clean, responsive student roster cards with clickable rows and `📷 Show Camera` action buttons.
  - In [`CandidateMonitorCard.jsx`](file:///c:/Major/frontend/src/components/monitoring/CandidateMonitorCard.jsx): Added an inline "Click to View Camera Feed" toggle alongside drill-down modal inspection via [`CandidateDetailModal.jsx`](file:///c:/Major/frontend/src/components/monitoring/CandidateDetailModal.jsx).

---

### 8. Database Connection Resilience (HikariCP)
- **Sleep/Wake & Connection Drop Resilience ([`application.properties`](file:///c:/Major/backend/src/main/resources/application.properties))**:
  - Configured robust connection pooling parameters:
    ```properties
    spring.datasource.hikari.connection-timeout=20000
    spring.datasource.hikari.maximum-pool-size=10
    spring.datasource.hikari.max-lifetime=1800000
    spring.datasource.hikari.idle-timeout=300000
    spring.datasource.hikari.keepalive-time=30000
    spring.datasource.hikari.validation-timeout=5000
    ```
  - Prevents stale connection drops and `PSQLException` crashes when host computers sleep, wake, or switch network interfaces.

---

### 9. Student Portal Dual-View Workflow
- Main portal page (`/student` in [`StudentPortal.jsx`](file:///c:/Major/frontend/src/pages/student/StudentPortal.jsx)) filtered to strictly show **only upcoming exams**.
- All attempted, completed, or in-progress exams moved to dedicated **My Attempts** page (`/student/attempts` in [`AttemptedExams.jsx`](file:///c:/Major/frontend/src/pages/student/AttemptedExams.jsx)).
- Interactive navigation tab bar linking between Upcoming and Attempted views with live counter badges.
- Backend endpoint `GET /api/exams/submissions` in [`ExamController.java`](file:///c:/Major/backend/src/main/java/com/proctoring/proctoring_backend/controller/ExamController.java) loading student submission records from PostgreSQL.

---

## 📁 Project Directory Structure
```
Major/
├── PROJECT_SUMMARY.md       <-- (This file: comprehensive record of system state)
├── README.md                <-- Setup guide, quick start, and demo credentials
├── .env                     <-- Unified environment variables
├── backend/                 <-- Spring Boot 4.1.1 Java 25 Backend
│   ├── src/main/java/com/proctoring/proctoring_backend/
│   │   ├── config/          (WebConfig, DatabaseSeeder, WebSocketConfig)
│   │   ├── controller/      (AuthController, CandidateController, ExamController, DashboardController, etc.)
│   │   ├── dto/             (StartSessionRequest, SessionResponse, ProctoringEventRequest, RiskSummary, etc.)
│   │   ├── entity/          (Candidate, Exam, Question, ExamSubmission, ExamSession, ProctoringEvent, Violation, User)
│   │   ├── repository/      (CandidateRepository, ExamRepository, ProctoringEventRepository, ViolationRepository, etc.)
│   │   └── service/         (ExamSessionService, ProctoringEventService, RiskScoringService)
│   ├── src/test/java/       (NetworkInterruptionProctoringTest, RiskScoringServiceTest, ProctoringBackendApplicationTests)
│   ├── src/main/resources/  (application.properties)
│   ├── mvnw / mvnw.cmd      (Maven wrapper scripts)
│   └── pom.xml
├── frontend/                <-- React 19 + Vite 8 Web Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/        (ProtectedRoute)
│   │   │   ├── common/      (UserAvatar, RiskBadge, StatusBadge, SearchBar, EmptyState, Modal, LoadingSpinner)
│   │   │   ├── dashboard/   (ActiveCandidates, ActiveExamsCard, RecentMalpracticesGraph, MalpracticeBreakdown, QuickActions, RecentViolations, StatCard)
│   │   │   ├── exam/        (QuestionCard, QuestionNavigator, SecurityViolationModal, NetworkInterruptionBanner, CameraPreview, ExamTimer, SecurityStatus, SecurityActivity)
│   │   │   ├── layout/      (AppLayout, Navbar, Sidebar)
│   │   │   └── monitoring/  (CandidateMonitorCard, CandidateDetailModal, CameraPlaceholder, MonitoringTimeline)
│   │   ├── pages/           (Dashboard, LiveMonitoring, StudentExam, StudentPortal, AttemptedExams, Exams, Students, Reports, Settings)
│   │   ├── services/        (api.js, auth.js, examSecurity.js, gazeAnalysis.js, studentExams.js, websocket.js)
│   │   └── index.css        (Global design tokens, avatar styles, layout utilities)
│   ├── package.json
│   └── vite.config.js
└── gaze_detection/          <-- Real-Time Gaze Estimation & AI Microservice
    ├── .venv/               (Isolated Python 3.11 virtual environment)
    ├── models/
    │   ├── face_landmarker.task             (MediaPipe Face Landmarker model)
    │   └── l2cs_net/
    │       └── l2cs_gaze360_resnet50.safetensors (L2CS-Net ResNet-50 Gaze360 weights)
    ├── calibration_data/    (Saved calibration coordinates)
    ├── server.py            (FastAPI Uvicorn API server on port 5001)
    ├── gaze_model.py        (L2CS-Net ResNet-50 inference engine)
    ├── landmarks.py         (MediaPipe 478 face and iris landmark detector)
    ├── head_pose.py         (Head yaw/pitch/roll estimator via solvePnP)
    ├── eye_crop.py          (Eye region extractor & geometric estimator)
    ├── capture.py           (Webcam capture module)
    ├── calibration.py       (Screen gaze calibration)
    ├── smoothing.py         (EMA temporal smoothing)
    ├── visualization.py     (Visual overlay engine)
    ├── requirements.txt     (Python dependencies)
    └── README.md            (Gaze detection architecture and guide)
```

---

## 🔑 Demo Credentials

| Role | Username / ID | Password | Access Portal |
| :--- | :--- | :--- | :--- |
| **Student** | `STU001` (or any `STU*` ID) | `student123` | [http://localhost:5173/student-login](http://localhost:5173/student-login) |
| **Invigilator / Admin** | `admin` | `admin123` | [http://localhost:5173/invigilator-login](http://localhost:5173/invigilator-login) |
