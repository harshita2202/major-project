# Project Summary: Proctortrack Online Examination & AI Proctoring Platform

> **Location:** Root directory (`/major-project/PROJECT_SUMMARY.md`)  
> **Status:** Full-Stack Integrated (Frontend + Backend + PostgreSQL)

---

## 📌 Executive Overview
A secure, full-stack online examination and automated proctoring platform designed with a dual-role workflow:
1. **Students:** Secure examination environment with anti-cheating deterrence mechanisms, MCQ tests, and interactive coding sandboxes.
2. **Invigilators / Admins:** Real-time monitoring command center with live candidate tracking, integrity risk analytics, infraction audit logs, and exam management.

---

## 🏗 Tech Stack & Architecture

| Layer | Technologies & Tools |
| :--- | :--- |
| **Frontend** | React 18, Vite, Lucide Icons, Pure CSS Design System (Glassmorphic / Dark mode) |
| **Backend** | Java 21, Spring Boot 3.x / 4.x, Spring Data JPA, Hibernate, REST APIs |
| **Database** | PostgreSQL (`proctoring_db`) |
| **Configuration** | Centralized `.env` and `.env.example` for unified environment management |

---

## 🧩 What Has Been Done (Module-by-Module)

### 1. Database & Domain Models (`backend/src/.../model`)
- **`Exam`**: Exam metadata, timing, duration, passing criteria, and active status.
- **`Question`**: Supports both Multiple Choice Questions (options, correct answer, explanation) and Coding Challenges (language, starter code, test cases).
- **`Student` & `Candidate`**: Student records, roll numbers, department, exam assignments, active status, and violation counts.
- **`ExamSubmission`**: Stores candidate responses, submitted code, final scores, and timestamps.
- **`Violation` & `SecurityEventEntity`**: Audit trail logging specific infractions (type, timestamp, severity, candidate ID).

### 2. Backend Services & REST APIs (`backend/src/.../controller`)
- **`AuthController`**: Dedicated authentication for both Student (`STU001` / `student123`) and Invigilator (`admin` / `admin123`).
- **`ExamController`**: Endpoints to list exams, fetch questions, submit completed exams, and execute code test cases.
- **`CandidateController`**: Live candidate status synchronization and monitoring feeds.
- **`DashboardController`**: Aggregated KPI metrics (active tests, connected candidates, critical alerts, avg scores).
- **`ViolationController`**: API to record real-time security events and retrieve violation audit logs.
- **`ReportController` & `StudentController`**: Student registries, exam score reports, and performance analytics.
- **`SettingController`**: Proctoring tolerance settings (tab switch limits, sensitivity).
- **`DatabaseSeeder`**: Automatic startup seeder that populates initial exams, coding problems, demo candidates, and sample violations.
- **`WebConfig`**: Cross-Origin Resource Sharing (CORS) configured for frontend communication.

### 3. Student Experience & Anti-Cheating Suite (`frontend/src/pages/...`)
- **Landing & Authentication (`Home.jsx`, `StudentLogin.jsx`)**:
  - Dual-portal entry with clean role selection and student credential validation.
- **Student Dashboard (`StudentPortal.jsx`)**:
  - Overview of upcoming scheduled exams, active tests, and past scorecards.
- **Assessment Engine (`StudentExam.jsx`)**:
  - **MCQ Interface**: Question navigator palette, answer selection, and progress indicator.
  - **Live Code Sandbox**: In-browser coding IDE with sample test-case verification.
  - **Camera Preview Feed**: Web camera preview for candidate identity verification.
  - **Proctoring Deterrence Suite**:
    - **Fullscreen Enforcement**: Forces full-screen mode and detects exits.
    - **Tab-Switch & Blur Detection**: Tracks when a candidate navigates away from the exam tab.
    - **Clipboard Locking**: Restricts copy and paste attempts (`Ctrl+C`, `Ctrl+V`, context menu).
    - **Session Recovery**: Preserves answers and state across page reloads.
    - **Live Malpractice Reporting**: Automatically posts violations directly to the backend.

### 4. Invigilator & Admin Operations Center (`frontend/src/pages/...`)
- **Control Dashboard (`Dashboard.jsx`)**:
  - Real-time stats cards (Active Exams, Total Candidates, Integrity Alerts, Average Score).
  - Quick action feeds and high-priority violation notifications.
- **Live Monitoring Room (`LiveMonitoring.jsx`, `CandidateDetailModal.jsx`)**:
  - Grid view of all active test-takers with integrity status badges (`NORMAL`, `SUSPICIOUS`, `FLAGGED`).
  - Drill-down modal to inspect individual student webcam feeds, answers, and violation timelines.
- **Exam Management (`Exams.jsx`)**:
  - Create, view, search, and manage exams with schedule and duration controls.
- **Candidate Registry (`Students.jsx`)**:
  - Searchable student directory with enrollment details and historical violation counts.
- **Incident & Malpractice Logs (`Violations.jsx`)**:
  - Detailed filterable log of all captured infractions with severity ratings and timestamps.
- **Reports & Analytics (`Reports.jsx`)**:
  - Comprehensive exam completion reports, pass/fail ratios, and export options.
- **System Settings (`Settings.jsx`)**:
  - Security configurations and proctoring threshold customization.

### 5. UI/UX Design System
- Modern dark-mode palette, glassmorphism cards, and responsive sidebar navigation (`AppLayout.jsx`).
- Custom reusable components: `StatusBadge`, `SearchBar`, `EmptyState`, `RecentViolations`.
- Integrated Lucide React icon set and styled alert notifications.

---

## 📁 Project Directory Structure
```
Major Project/
└── major-project/
    ├── PROJECT_SUMMARY.md       <-- (This file: quick overview of everything built)
    ├── README.md                <-- Setup instructions and demo credentials
    ├── .env                     <-- Central environment configuration
    ├── .env.example             <-- Environment template
    ├── backend/                 <-- Spring Boot 3 Java 21 REST API
    │   ├── src/main/java/com/proctoring/proctoring_backend/
    │   │   ├── config/          (WebConfig, DatabaseSeeder)
    │   │   ├── controller/      (Auth, Exam, Candidate, Dashboard, Violation, etc.)
    │   │   ├── model/           (Exam, Question, Student, Candidate, Violation, etc.)
    │   │   └── repository/      (Spring Data JPA repositories)
    │   └── pom.xml
    └── frontend/                <-- React 18 + Vite Web Application
        ├── src/
        │   ├── components/      (Layout, Dashboard, Monitoring, Common UI)
        │   ├── pages/           (Home, Logins, StudentExam, LiveMonitoring, Reports, etc.)
        │   ├── services/        (API clients & fetch services)
        │   └── index.css        (Custom design system)
        └── package.json
```

---

## 🔑 Default Credentials
- **Student Portal:** `STU001` / `student123`
- **Invigilator Dashboard:** `admin` / `admin123`
