# Project Summary: Proctortrack Online Examination & AI Proctoring Platform

> **Location:** Root directory (`/major-project/PROJECT_SUMMARY.md`)  
> **Status:** Full-Stack Integrated (Frontend + Backend + PostgreSQL + WebSocket STOMP)  
> **Last Updated:** September 2026  

---

## 📌 Executive Overview
**Proctortrack** is an enterprise-grade, full-stack online examination and automated AI proctoring platform engineered with a strict dual-role workflow:
1. **Students:** An anti-cheating, lockdown assessment environment supporting both Multiple-Choice Questions (MCQ) and interactive coding sandboxes, complete with automated scoring, persistent sessions, network interruption grace recovery, and multi-tier malpractice safeguards.
2. **Invigilators / Admins:** A centralized live monitoring command center featuring real-time telemetry KPI cards, interactive malpractice trend graphs, categorized violation breakdowns, active exam tracking, on-demand camera feeds, automated infraction detection, and WebSocket-driven risk updates.

---

## 🏗 Tech Stack & Architecture

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, Lucide React, WebSocket / SockJS STOMP Client, Pure CSS Design System (Custom Glassmorphism, Dark/Light Mode Tokens) |
| **Backend** | Java 25 / 21, Spring Boot 4.1.1, Spring Data JPA, Hibernate ORM 7.4.5, Spring WebSocket & STOMP Message Broker, HikariCP Connection Pooling, Maven |
| **Database** | PostgreSQL 18+ (`proctoring_db`) with Hibernate schema validation & migration |
| **Security & ML** | Fullscreen API, Page Visibility API, Network Offline/Online API, Clipboard lockdown, AI/ML risk scoring engine (0–100 scale) with real-time escalation |
| **Configuration** | Centralized `.env` and `.env.example` supporting custom ports, resilient pool settings, and dynamic API endpoints |

---

## 🚀 Key Features & Recent Improvements

### 1. Network Interruption & Offline Resilience Architecture
- **Grace Period Protection ([`NetworkInterruptionBanner.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/exam/NetworkInterruptionBanner.jsx) & [`StudentExam.jsx`](file:///e:/Major%20Project/major-project/frontend/src/pages/StudentExam.jsx))**:
  - Implemented an intelligent **10-second countdown grace period** upon browser network disconnect (`window.onoffline`), preventing unfair immediate penalties for transient WiFi drops or router handshakes.
  - While offline within the grace period, an amber sticky banner alerts the student with live second-by-second countdowns and instructions to restore connectivity.
- **Rule-Based Penalty Allocation ([`RiskScoringService.java`](file:///e:/Major%20Project/major-project/backend/src/main/java/com/proctoring/proctoring_backend/service/RiskScoringService.java))**:
  - If network disconnection persists beyond 10 seconds, `triggerNetworkInterruptionViolation()` records a `NETWORK_INTERRUPTION` penalty (+5 risk points, severity: low).
  - The status badge transitions from amber grace to red: `"Offline · Penalty Recorded"`.
- **Deferred Event Sync & Auto-Recovery**:
  - When connection is restored (`window.ononline`), the timer clears, and a dismissible green toast confirms: *"Network connection restored. You may continue the exam."*
  - Any pending offline infraction telemetry unable to dispatch while disconnected is buffered locally and automatically flushed to the backend via `recordExamEvent()`.
- **Real-Time WebSocket Ingestion ([`ProctoringEventService.java`](file:///e:/Major%20Project/major-project/backend/src/main/java/com/proctoring/proctoring_backend/service/ProctoringEventService.java))**:
  - Network interruption events are stored in PostgreSQL (`proctoring_events` and `violations` tables) and broadcasted in real-time over `/topic/examiner/risk-updates` and `/topic/events` to proctors.
- **Escalation Thresholds & Warning**:
  - Pushing the candidate's cumulative risk score into Medium (&ge; 50) triggers a warning modal, while reaching High (&ge; 80) initiates automatic exam submission with reason `CHEATING_RISK_THRESHOLD_REACHED`.
- **Developer / Evaluator Testing Utilities**:
  - Window helpers (`window.__simulateOffline` and `window.__simulateOnline`) and Vite DEV mode inline simulation buttons enable instant offline/online testing without unplugging network adapters.

---

### 2. Revamped Admin & Invigilator Command Center
- **Interactive Analytics & Malpractice Visualizations ([`Dashboard.jsx`](file:///e:/Major%20Project/major-project/frontend/src/pages/Dashboard.jsx))**:
  - **Malpractice Breakdown Card ([`MalpracticeBreakdown.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/dashboard/MalpracticeBreakdown.jsx))**: Categorized distribution of violations across Tab Switching, Fullscreen Exits, Clipboard Misuse, Network Drops, and Gaze Deviations with progress bars and percentage weights.
  - **Recent Malpractices Trend Graph ([`RecentMalpracticesGraph.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/dashboard/RecentMalpracticesGraph.jsx))**: Hourly/daily chronological violation distribution graph visualizing security incident surges over time.
  - **Active Exams Live Card ([`ActiveExamsCard.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/dashboard/ActiveExamsCard.jsx))**: Displays currently running assessments, active candidate headcounts, countdown timers, and direct jump buttons to live invigilation.
  - **Quick Actions Bar ([`QuickActions.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/dashboard/QuickActions.jsx))**: One-click actions for invigilators to schedule examinations, launch live camera monitors, review audit logs, and trigger system health cleanups.
  - **Recent Violations Feed ([`RecentViolations.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/dashboard/RecentViolations.jsx))**: Real-time event log featuring student avatars, severity badges (`High`, `Medium`, `Low`), exact timestamps, and modal review triggers.

---

### 3. Dynamic Exam Scoring & Real-Time Auto-Termination
- **Automated Score Evaluation ([`StudentExam.jsx`](file:///e:/Major%20Project/major-project/frontend/src/pages/StudentExam.jsx))**:
  - Implemented `calculateExamScore()` to dynamically evaluate student submissions across both MCQs (comparing answers against `correctIndex`) and coding challenges.
  - Eliminated hardcoded `score: 0` submissions; the submission screen provides an instant, accurate scorecard displaying percentage, answered count, and performance breakdown.
- **Strict Multi-Tier Violation Enforcement**:
  - **Tab Switching**: Immediate warning modals on tab switches or browser blur; auto-terminates upon reaching the threshold (**3 infractions**).
  - **Fullscreen Exits**: Fullscreen enforcement catches Esc / Alt-Tab exits; triggers auto-disqualification upon **3 infractions**.
  - **Cumulative ML Risk Scoring**: Real-time telemetry evaluates events via backend `RiskScoringService`. Exceeding the high-risk threshold (**&ge; 80 points**) immediately auto-terminates the examination.
- **Persistent Audit Logging**:
  - Endpoints update the student's status to `submitted`, `time_expired`, or `terminated` / `disqualified`, persisting records across `ExamSubmissionRepository` and `CandidateRepository`.

---

### 4. Live Invigilation: Real-Time Active Attempt Tracking
- **Complete Removal of Hardcoded Dummy Candidates**:
  - Purged static demo seeds (`cand-1` Alex Morgan, `cand-2` David Chen, `cand-3` Sarah Jenkins, `cand-4` Marcus Brody) from [`DatabaseSeeder.java`](file:///e:/Major%20Project/major-project/backend/src/main/java/com/proctoring/proctoring_backend/config/DatabaseSeeder.java) and [`mockData.js`](file:///e:/Major%20Project/major-project/frontend/src/data/mockData.js).
  - Added an automatic database cleanup mechanism on startup to eliminate stale dummy entries.
- **Dynamic Attempt Lifecycle ([`StudentExam.jsx`](file:///e:/Major%20Project/major-project/frontend/src/pages/StudentExam.jsx) & [`CandidateController.java`](file:///e:/Major%20Project/major-project/backend/src/main/java/com/proctoring/proctoring_backend/controller/CandidateController.java))**:
  - **Exam Start**: When a student clicks *"Start Examination"* or enters an active exam, `startExamAttempt()` dispatches `POST /api/candidates/start-attempt` with real candidate credentials and exam metadata.
  - **Progress Sync**: An active background sync effect periodically streams answered counts, completion percentages, and countdown timers to the backend via `POST /api/candidates/update-progress`.
  - **Exam Completion / Disqualification**: Submitting or being disqualified triggers `endExamAttempt()`, updating candidate status to `completed` or `disqualified`.
- **Live Filtering**:
  - `GET /api/candidates/live` returns **only** candidates with `status = "active"`, automatically filtering out finished students and dummy IDs.
  - When no students are taking exams, the Live Invigilation page displays a clean empty state: *"No Students Currently Attempting Exams."*
- **Real-Time Polling & Reactivity ([`LiveMonitoring.jsx`](file:///e:/Major%20Project/major-project/frontend/src/pages/LiveMonitoring.jsx))**:
  - Equipped with background polling (every 3 seconds), window focus listeners, and cross-tab storage synchronizers so newly attempting students appear immediately without requiring manual page reloads.

---

### 5. On-Demand Camera Feeds & Bandwidth Optimization
- **Bandwidth & Performance Fix**:
  - Replaced simultaneous live video streaming for every student with **on-demand monitoring**.
  - In [`ActiveCandidates.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/dashboard/ActiveCandidates.jsx): Displays clean, responsive student roster cards with clickable rows and `📷 Show Camera` action buttons.
  - In [`CandidateMonitorCard.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/monitoring/CandidateMonitorCard.jsx): Added an inline "Click to View Camera Feed" toggle alongside drill-down modal inspection via [`CandidateDetailModal.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/monitoring/CandidateDetailModal.jsx).

---

### 6. Database Connection Resilience (HikariCP)
- **Sleep/Wake & Connection Drop Resilience ([`application.properties`](file:///e:/Major%20Project/major-project/backend/src/main/resources/application.properties))**:
  - Configured robust connection pooling parameters:
    ```properties
    spring.datasource.hikari.connection-timeout=20000
    spring.datasource.hikari.maximum-pool-size=10
    spring.datasource.hikari.max-lifetime=1800000
    spring.datasource.hikari.idle-timeout=300000
    spring.datasource.hikari.keepalive-time=30000
    spring.datasource.hikari.validation-timeout=5000
    ```
  - Prevents stale connection drops and `PSQLException` crashes when host computers sleep, wake, or switch network interfaces during development or deployment.

---

### 7. UI Collision & Text Overwriting Fixes
- **Avatar Overflow Resolution**:
  - Dedicated [`UserAvatar.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/common/UserAvatar.jsx) component detects image URLs (rendering `<img>` with automatic load error fallback) versus 2-letter uppercase initials, eliminating raw URL text rendering issues.
  - Flexbox truncation (`minWidth: 0`, `overflow: hidden`, `textOverflow: ellipsis`) prevents card header collisions across [`CandidateMonitorCard.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/monitoring/CandidateMonitorCard.jsx), [`ActiveCandidates.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/dashboard/ActiveCandidates.jsx), and [`RecentViolations.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/dashboard/RecentViolations.jsx).
- **Risk Level Normalization**:
  - Standardized risk values to title-case (`'Low'`, `'Medium'`, `'High'`) across backend controllers and frontend normalizers, fixing telemetry filter badge counts.

---

### 8. Compact Header, Functional Invigilator Actions & Simplified Incident Logs
- **Clean & Compact Header ([`Navbar.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/layout/Navbar.jsx) & [`Dashboard.jsx`](file:///e:/Major%20Project/major-project/frontend/src/pages/Dashboard.jsx))**:
  - Purged redundant top subtitle text (*"Real-time overview of active sessions..."*) and secondary tags (*"Academic Portal"*), leaving a clean, compact header across the dashboard and top navbar.
- **Interactive Lead Invigilator Dropdown Suite**:
  - **Invigilator Profile**: Functional modal revealing official invigilator details (Name, Staff ID `INV-2026-884`, Tier-4 Clearance, Department, Email).
  - **Department Credentials**: Security modal displaying institutional keys and an active `Proctor API Token` with interactive copy-to-clipboard functionality.
  - **System Health Diagnostics**: Live diagnostics modal conducting operational checks across the Spring Boot API, PostgreSQL, WebSocket STOMP, and Lockdown Controller with interactive re-test execution.
  - **Sign Out Session**: Modal confirmation dialog preventing accidental session loss and safely terminating the session with redirection to login.
- **Removal of Standalone Incident Logs Page**:
  - Removed the Incident Logs page (`/violations`) and navigation item from the sidebar and router, consolidating invigilation surveillance and malpractice tracking directly into the Live Invigilation grid and Examination Dashboard.

---

### 9. Hardcoded Logs Removal & Real Telemetry Synchronization
- **Purge of Fake Hardcoded Malpractices**:
  - Eliminated static seeded violations (`VIO-101`, `VIO-102`, `VIO-103` referencing dummy candidates `cand-2`, `cand-3`) from [`DatabaseSeeder.java`](file:///e:/Major%20Project/major-project/backend/src/main/java/com/proctoring/proctoring_backend/config/DatabaseSeeder.java) and added automatic startup cleanup of legacy dummy violations.
  - Purged hardcoded mock fallback lists (`mockAllViolations`, `mockRecentViolations`) from [`api.js`](file:///e:/Major%20Project/major-project/frontend/src/services/api.js).
  - Removed hardcoded default fallback counts (e.g. 24 total, 9 fullscreen, 6 paste, 5 shortcut, 4 other) from [`RecentMalpracticesGraph.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/dashboard/RecentMalpracticesGraph.jsx), [`MalpracticeBreakdown.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/dashboard/MalpracticeBreakdown.jsx), [`RecentViolations.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/dashboard/RecentViolations.jsx), and [`Dashboard.jsx`](file:///e:/Major%20Project/major-project/frontend/src/pages/Dashboard.jsx).
- **End-to-End Real Data Synchronization**:
  - Infractions triggered during exams (e.g. Tab Switches, Fullscreen Exits, Copy-Paste, Network Drops) in [`StudentExam.jsx`](file:///e:/Major%20Project/major-project/frontend/src/pages/StudentExam.jsx) stream via `recordExamEvent()`.
  - Violations immediately persist to PostgreSQL (`violations` table) and cross-tab storage (`proctor_real_violations`), dynamically updating Incident Logs and dashboard analytics in real-time.
  - When no infractions exist, systems cleanly report 0 malpractices with empty state messaging.

---

## 🧩 Module Breakdown

### 1. Database & Persistence Layer (`backend/src/...`)
- **`Candidate` & `CandidateRepository`**: Tracks real-time active test-takers, biometrics, timeline events, remaining duration, risk scores, and active status (`findByStatusIgnoreCase`).
- **`Exam` & `ExamRepository`**: Manages scheduled assessments, durations, passing scores, proctoring lockdown modes, and question counts.
- **`Question` & `QuestionRepository`**: Flexible entity supporting MCQ options, correct answers, coding constraints, starter code, and sample test cases.
- **`ExamSubmission` & `ExamSubmissionRepository`**: Stores submitted responses, auto-evaluated scores, total questions, and submission statuses.
- **`ExamSession` & `ExamSessionRepository`**: Tracks individual session lifecycles, active timestamps, infractions, and risk scores.
- **`ProctoringEvent` & `ProctoringEventRepository`**: High-resolution audit table of every incoming telemetry infraction, timestamp, severity, and risk points.
- **`Violation` & `ViolationRepository`**: Detailed audit logs of all security incidents with severity classifications (`low`, `medium`, `high`).
- **`User` & `UserRepository`**: Authentication credential store for students, invigilators, and administrators.

### 2. Backend Services & Controllers (`backend/src/...`)
- **`CandidateController`**: Endpoints for `/api/candidates/live`, `/start-attempt`, `/update-progress`, and `/clean-legacy`.
- **`ExamController`**: Endpoints for exam listings, question delivery (`/api/exams/{id}/questions`), dynamic submission (`/api/exams/{id}/submit`), and telemetry event ingestion (`/api/exams/{id}/events`).
- **`ExamSessionController` & `ExamSessionService`**: Manages exam sessions, risk scoring progression, medium-risk warnings, and auto-submissions.
- **`ProctoringEventService`**: Core handler for telemetry event ingestion, point allocation, database auditing, and WebSocket broadcasts to `/topic/examiner/risk-updates`.
- **`RiskScoringService`**: Rule-based ML scoring engine calculating cumulative penalty points (e.g. +5 for `NETWORK_INTERRUPTION`, +10 for `TAB_SWITCH`, +15 for `FULLSCREEN_EXIT`), evaluating risk levels (`LOW`, `MEDIUM`, `HIGH`), and returning feature warnings.
- **`DashboardController`**: Aggregates live KPI telemetry (strictly counting active in-progress students, live exams, and critical alerts).
- **`DatabaseSeeder`**: Seeds standard exams, coding assessments, and questions while ensuring dummy candidates are never pre-populated.

### 3. Student Examination Experience (`frontend/src/...`)
- **`StudentExam.jsx`**: Core examination engine handling MCQ navigation, timer countdown, question bookmarking, answer persistence, network offline detection, and submission score calculation.
- **`NetworkInterruptionBanner.jsx`**: Sticky banner providing real-time network grace countdown (10s), penalty warnings, reconnection notices, and DEV simulation triggers.
- **`SecurityViolationModal.jsx`**: High-priority modal alerting students to infractions with real-time attempt counters and termination explanations.
- **`CameraPreview.jsx`**: Webcam feed integration providing real-time local identity preview and stream readiness indicators.
- **`examSecurity.js`**: Low-level browser enforcement detecting fullscreen toggles, tab blur events, network disruptions, and blocking unauthorized key combinations (`Ctrl+C`, `Ctrl+V`, `F12`, right-click).
- **`websocket.js`**: STOMP over SockJS client supporting live telemetry subscriptions and examiner alerts.

### 4. Invigilator & Admin Command Center (`frontend/src/...`)
- **`Dashboard.jsx`**: Operational overview with real-time telemetry KPI cards, quick actions, and recent activity feeds.
- **`ActiveExamsCard.jsx`**: Live tracking card of running examinations and student numbers.
- **`RecentMalpracticesGraph.jsx`**: Time-series graph of infractions and security alerts.
- **`MalpracticeBreakdown.jsx`**: Doughnut / categorical breakdown of security violation types.
- **`QuickActions.jsx`**: Invigilator action shortcuts.
- **`ActiveCandidates.jsx`**: Student directory table featuring search filtering, progress bars, risk badges, and on-demand camera access.
- **`LiveMonitoring.jsx`**: Invigilation grid with risk filtering (`Normal`, `Warning`, `High Risk`), candidate cards, and real-time polling.
- **`CandidateDetailModal.jsx`**: Detailed modal displaying live camera feeds, telemetry check-marks, answers, and violation timelines.
- **`Violations.jsx`**: Full audit log of all historical security incidents with severity filters and review status controls.
- **`Exams.jsx` & `Students.jsx`**: Examination scheduling and student directory management interfaces.

---

## 📁 Project Directory Structure
```
Major Project/
└── major-project/
    ├── PROJECT_SUMMARY.md       <-- (This file: comprehensive record of system state)
    ├── README.md                <-- Setup guide, quick start, and demo credentials
    ├── .env                     <-- Environment configuration
    ├── .env.example             <-- Environment template
    ├── backend/                 <-- Spring Boot 4.1.1 Java 25 Backend
    │   ├── src/main/java/com/proctoring/proctoring_backend/
    │   │   ├── config/          (WebConfig, DatabaseSeeder, WebSocketConfig)
    │   │   ├── controller/      (AuthController, CandidateController, ExamController, DashboardController, etc.)
    │   │   ├── dto/             (StartSessionRequest, SessionResponse, ProctoringEventRequest, RiskSummary, etc.)
    │   │   ├── entity/          (Candidate, Exam, Question, ExamSubmission, ExamSession, ProctoringEvent, Violation, User)
    │   │   ├── repository/      (CandidateRepository, ExamRepository, ProctoringEventRepository, ViolationRepository, etc.)
    │   │   └── service/         (ExamSessionService, ProctoringEventService, RiskScoringService)
    │   ├── src/test/java/       (NetworkInterruptionProctoringTest, RiskScoringServiceTest, ProctoringBackendApplicationTests)
    │   └── pom.xml
    └── frontend/                <-- React 19 + Vite 8 Web Application
        ├── src/
        │   ├── components/
        │   │   ├── auth/        (ProtectedRoute)
        │   │   ├── common/      (UserAvatar, RiskBadge, StatusBadge, SearchBar, EmptyState, Modal, LoadingSpinner)
        │   │   ├── dashboard/   (ActiveCandidates, ActiveExamsCard, RecentMalpracticesGraph, MalpracticeBreakdown, QuickActions, RecentViolations, StatCard)
        │   │   ├── exam/        (QuestionCard, QuestionNavigator, SecurityViolationModal, NetworkInterruptionBanner, CameraPreview, ExamTimer, SecurityStatus, SecurityActivity)
        │   │   ├── layout/      (AppLayout, Navbar, Sidebar)
        │   │   └── monitoring/  (CandidateMonitorCard, CandidateDetailModal, CameraPlaceholder, MonitoringTimeline)
        │   ├── pages/           (Dashboard, LiveMonitoring, StudentExam, StudentPortal, Exams, Students, Reports, Settings)
        │   ├── services/        (api.js, auth.js, examSecurity.js, websocket.js)
        │   └── index.css        (Global design tokens, avatar styles, layout utilities)
        └── package.json
```

---

## 🔑 Demo Credentials

| Role | Username / ID | Password | Access Portal |
| :--- | :--- | :--- | :--- |
| **Student** | `STU001` (or any `STU*` ID) | `student123` | `/student/login` &rarr; `/student/portal` |
| **Invigilator / Admin** | `admin` | `admin123` | `/admin/login` &rarr; `/dashboard` |

---

## 🧪 Verification & Test Suite
- **Unit & Integration Tests ([`NetworkInterruptionProctoringTest.java`](file:///e:/Major%20Project/major-project/backend/src/test/java/com/proctoring/proctoring_backend/NetworkInterruptionProctoringTest.java))**:
  - Tests verify that `NETWORK_INTERRUPTION` adds exactly 5 risk points.
  - Tests verify that network interruption events persist into PostgreSQL, increment cumulative session risk score, and broadcast real-time events over WebSocket (`/topic/examiner/risk-updates`).
  - Tests verify risk escalation: score passing 50 triggers `isMediumWarningTriggered()`, and score passing 80 triggers `isAutoSubmitted()` with reason `CHEATING_RISK_THRESHOLD_REACHED`.
- **Unit Tests ([`RiskScoringServiceTest.java`](file:///e:/Major%20Project/major-project/backend/src/test/java/com/proctoring/proctoring_backend/RiskScoringServiceTest.java))**:
  - Verifies exact point allocations across all event types: `NETWORK_INTERRUPTION` (5), `TAB_SWITCH` (10), `FULLSCREEN_EXIT` (15), `DEV_TOOLS_ATTEMPT` (25), etc.
  - Validates exact feature-specific warning strings returned for user prompts.
- **Frontend Build**: Builds cleanly without errors via Vite (`npm run build`).
- **End-to-End Resilience**:
  - Verified student offline disconnect &rarr; 10s grace timer countdown &rarr; penalty allocation &rarr; reconnect auto-sync &rarr; invigilator dashboard alert.
- **Student Portal Refinement**:
  - Main portal page (`/student` in [`StudentPortal.jsx`](file:///e:/Major%20Project/major-project/frontend/src/pages/student/StudentPortal.jsx)) filtered to strictly show **only upcoming exams**.
  - All attempted, completed, or in-progress exams moved to dedicated **My Attempts** page (`/student/attempts` in [`AttemptedExams.jsx`](file:///e:/Major%20Project/major-project/frontend/src/pages/student/AttemptedExams.jsx)).
  - Interactive navigation tab bar linking between Upcoming and Attempted views with live counter badges.
  - Added backend endpoint `GET /api/exams/submissions` in [`ExamController.java`](file:///e:/Major%20Project/major-project/backend/src/main/java/com/proctoring/proctoring_backend/controller/ExamController.java) to load student submission records from PostgreSQL.

