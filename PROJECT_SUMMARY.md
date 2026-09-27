# Project Summary: Proctortrack Online Examination & AI Proctoring Platform

> **Location:** Root directory (`/major-project/PROJECT_SUMMARY.md`)  
> **Status:** Full-Stack Integrated (Frontend + Backend + PostgreSQL)  
> **Last Updated:** September 2026

---

## 📌 Executive Overview
**Proctortrack** is an enterprise-grade, full-stack online examination and automated AI proctoring platform engineered with a strict dual-role workflow:
1. **Students:** An anti-cheating, lockdown assessment environment supporting both Multiple-Choice Questions (MCQ) and interactive coding sandboxes, complete with automated scoring, persistent sessions, and malpractice safeguards.
2. **Invigilators / Admins:** A centralized live monitoring command center featuring on-demand camera feeds, real-time candidate attempt tracking, automated infraction detection, risk scoring analytics, and comprehensive incident logs.

---

## 🏗 Tech Stack & Architecture

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, Lucide React, Pure CSS Design System (Custom Glassmorphism / Clean Dark & Light Accents) |
| **Backend** | Java 25 / 21, Spring Boot 4.1.1, Spring Data JPA, Hibernate ORM 7.4.5, WebSocket STOMP, Maven |
| **Database** | PostgreSQL 18+ (`proctoring_db`) with Hibernate schema validation & migration |
| **Security & ML** | Fullscreen API, Page Visibility API, Clipboard lockdown, AI/ML risk scoring engine (0–100 scale) |
| **Configuration** | Centralized `.env` and `.env.example` supporting custom ports and dynamic endpoints |

---

## 🚀 Key Features & Recent Improvements

### 1. Dynamic Exam Scoring & Real-Time Auto-Termination
- **Automated Score Evaluation ([`StudentExam.jsx`](file:///e:/Major%20Project/major-project/frontend/src/pages/StudentExam.jsx))**:
  - Implemented `calculateExamScore()` to dynamically evaluate student submissions across both MCQs (comparing answers against `correctIndex`) and coding challenges.
  - Eliminated hardcoded `score: 0` submissions; the submission screen now provides an instant, accurate scorecard displaying percentage, answered count, and performance breakdown.
- **Strict Multi-Tier Violation Enforcement**:
  - **Tab Switching**: Immediate warning modals on tab switches or browser blur; auto-terminates upon reaching the threshold (**3 infractions**).
  - **Fullscreen Exits**: Fullscreen enforcement catches Esc / Alt-Tab exits; triggers auto-disqualification upon **3 infractions**.
  - **Cumulative ML Risk Scoring**: Real-time telemetry evaluates events via backend `RiskScoringService`. Exceeding the high-risk threshold (**&ge; 80 points**) immediately auto-terminates the examination.
- **Persistent Audit Logging**:
  - Endpoints update the student's status to `submitted`, `time_expired`, or `terminated` / `disqualified`, persisting records across `ExamSubmissionRepository` and `CandidateRepository`.

---

### 2. Live Invigilation: Real-Time Active Attempt Tracking
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

### 3. On-Demand Camera Feeds & Bandwidth Optimization
- **Bandwidth & Performance Fix**:
  - Replaced simultaneous live video streaming for every student with **on-demand monitoring**.
  - In [`ActiveCandidates.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/dashboard/ActiveCandidates.jsx): Displays clean, responsive student roster cards with clickable rows and `📷 Show Camera` action buttons.
  - In [`CandidateMonitorCard.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/monitoring/CandidateMonitorCard.jsx): Added an inline "Click to View Camera Feed" toggle alongside drill-down modal inspection via [`CandidateDetailModal.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/monitoring/CandidateDetailModal.jsx).

---

### 4. Text Overwriting & UI Collision Fix
- **Avatar Overflow Resolution**:
  - Fixed an issue where raw Unsplash image URLs inside candidate objects were rendered as text into `.avatar-circle`, overflowing across card headers and obscuring student names and exam titles.
  - Created a dedicated, resilient component [`UserAvatar.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/common/UserAvatar.jsx) that detects image URLs (rendering `<img>` with automatic load error fallback) versus 2-letter uppercase initials.
  - Updated card headers across [`CandidateMonitorCard.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/monitoring/CandidateMonitorCard.jsx), [`ActiveCandidates.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/dashboard/ActiveCandidates.jsx), and [`RecentViolations.jsx`](file:///e:/Major%20Project/major-project/frontend/src/components/dashboard/RecentViolations.jsx) with flexbox truncation (`minWidth: 0`, `overflow: hidden`, `textOverflow: ellipsis`) to prevent overlap with status badges.
- **Risk Level Normalization**:
  - Standardized risk values to title-case (`'Low'`, `'Medium'`, `'High'`) across backend controllers and frontend normalizers, fixing telemetry filter badge counts.

---

## 🧩 Module Breakdown

### 1. Database & Persistence Layer (`backend/src/...`)
- **`Candidate` & `CandidateRepository`**: Tracks real-time active test-takers, biometrics, timeline events, remaining duration, risk scores, and active status (`findByStatusIgnoreCase`).
- **`Exam` & `ExamRepository`**: Manages scheduled assessments, durations, passing scores, proctoring lockdown modes, and question counts.
- **`Question` & `QuestionRepository`**: Flexible entity supporting MCQ options, correct answers, coding constraints, starter code, and sample test cases.
- **`ExamSubmission` & `ExamSubmissionRepository`**: Stores submitted responses, auto-evaluated scores, total questions, and submission statuses.
- **`ExamSession` & `ExamSessionRepository`**: Tracks individual session lifecycles, active timestamps, infractions, and risk scores.
- **`Violation` & `ViolationRepository`**: Detailed audit logs of all security incidents with severity classifications (`low`, `medium`, `high`).

### 2. Backend Services & Controllers (`backend/src/...`)
- **`CandidateController`**: Endpoints for `/api/candidates/live`, `/start-attempt`, `/update-progress`, and `/clean-legacy`.
- **`ExamController`**: Endpoints for exam listings, question delivery (`/api/exams/{id}/questions`), dynamic submission (`/api/exams/{id}/submit`), and telemetry event ingestion (`/api/exams/{id}/events`).
- **`ExamSessionController` & `ExamSessionService`**: Manages exam sessions, risk scoring progression, medium-risk warnings, and auto-submissions.
- **`DashboardController`**: Aggregates live KPI telemetry (strictly counting active in-progress students, live exams, and critical alerts).
- **`RiskScoringService`**: Rule-based ML scoring calculating cumulative penalty points for tab switches, fullscreen violations, and absence.
- **`DatabaseSeeder`**: Seeds standard exams, coding assessments, and questions while ensuring dummy candidates are never pre-populated.

### 3. Student Examination Experience (`frontend/src/pages/...`)
- **`StudentExam.jsx`**: Core examination engine handling MCQ navigation, timer countdown, question bookmarking, answer persistence, and submission score calculation.
- **`SecurityViolationModal.jsx`**: High-priority modal alerting students to infractions with real-time attempt counters and termination explanations.
- **`CameraPreview.jsx`**: Webcam feed integration providing real-time local identity preview and stream readiness indicators.
- **`examSecurity.js`**: Low-level browser enforcement detecting fullscreen toggles, tab blur events, and blocking unauthorized key combinations (`Ctrl+C`, `Ctrl+V`, `F12`, right-click).

### 4. Invigilator & Admin Command Center (`frontend/src/pages/...`)
- **`Dashboard.jsx`**: Operational overview with real-time telemetry KPI cards, quick actions, and recent activity feeds.
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
    │   │   ├── controller/      (CandidateController, ExamController, DashboardController, etc.)
    │   │   ├── dto/             (StartSessionRequest, SessionResponse, RiskSummary, etc.)
    │   │   ├── entity/          (Candidate, Exam, Question, ExamSubmission, ExamSession, etc.)
    │   │   ├── repository/      (CandidateRepository, ExamRepository, ViolationRepository, etc.)
    │   │   └── service/         (ExamSessionService, ProctoringEventService, RiskScoringService)
    │   ├── src/test/java/       (RiskScoringServiceTest, ProctoringBackendApplicationTests)
    │   └── pom.xml
    └── frontend/                <-- React 19 + Vite 8 Web Application
        ├── src/
        │   ├── components/
        │   │   ├── common/      (UserAvatar, RiskBadge, StatusBadge, SearchBar, EmptyState)
        │   │   ├── dashboard/   (ActiveCandidates, RecentViolations, StatsGrid)
        │   │   ├── exam/        (QuestionCard, QuestionNavigator, SecurityViolationModal, CameraPreview)
        │   │   ├── layout/      (AppLayout, Navbar, Sidebar)
        │   │   └── monitoring/  (CandidateMonitorCard, CandidateDetailModal, CameraPlaceholder)
        │   ├── pages/           (Dashboard, LiveMonitoring, StudentExam, StudentPortal, Violations, Exams)
        │   ├── services/        (api.js, auth.js, examSecurity.js)
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

## 🧪 Verification & Status
- **Backend Build & Tests**: Compiles cleanly with Maven; 5/5 unit & integration tests passing (`mvnw test`).
- **Frontend Build**: Builds cleanly without errors via Vite (`npm run build`).
- **End-to-End Workflow**: Verified student exam entry &rarr; dynamic live attempt appearance &rarr; violation logging &rarr; submission evaluation &rarr; automatic de-listing from live roster.
