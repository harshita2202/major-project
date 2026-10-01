# Proctortrack Online Examination & AI Proctoring Platform

An enterprise-grade, full-stack online examination and automated proctoring platform designed with dual role-based workflows for **Students** and **Invigilators**.

---

## 🌟 Key Features

### 👨‍🎓 Student Experience
- **Role-Based Access**: Dedicated student portal with secure authentication.
- **Dynamic Assessment Engine**:
  - Multiple Choice Question (MCQ) assessments.
  - Interactive **Coding Examination** sandbox with real-time test cases and syntax feedback.
- **Proctoring Deterrence Suite**:
  - Live anti-copy / anti-paste deterrence mechanisms.
  - Fullscreen enforcement with warning modals.
  - Tab-switching detection and warning counter.
  - Web camera preview feed.
  - Instant session recovery across page refreshes.

### 👩‍🏫 Invigilator Experience
- **Operations Control Center**: Real-time KPI cards for active sessions, online candidates, and PEEP incident flags.
- **Live Candidate Monitoring**: Real-time student progress tracking and integrity risk indicators.
- **Incident & Malpractice Registry**: Live log of infractions (e.g. `CLIPBOARD_PASTE_ATTEMPT`, `TAB_SWITCH`, `FULLSCREEN_EXIT`).
- **Exam Management**: Create, schedule, and configure exams directly connected to PostgreSQL.

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Lucide Icons, Pure CSS Design System
- **Backend**: Spring Boot 3.x / 4.x, Java 21, Spring Data JPA, Hibernate
- **Database**: PostgreSQL (`proctoring_db`)
- **Architecture**: REST API architecture with unified environment configuration

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+) & **npm**
- **Java JDK 21+**
- **PostgreSQL** running on `localhost:5432` with a database named `proctoring_db`

### 2. Environment Setup
Both backend and frontend can be configured via `.env` files. Copy the templates:
```bash
# Root template
cp .env.example .env
```

Default configuration:
```env
SERVER_PORT=8080
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/proctoring_db
SPRING_DATASOURCE_USERNAME=postgres
SPRING_DATASOURCE_PASSWORD=postgres

VITE_API_BASE_URL=http://localhost:8080
```

### 3. Backend Setup
```bash
cd backend
./mvnw clean spring-boot:run
```
*The database seeder automatically populates initial exams, coding questions, candidates, and violation logs on first run.*

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Access the application at `http://localhost:5173`.

---

## 🔑 Demo Credentials

| Role | Username / ID | Password | Access URL |
| :--- | :--- | :--- | :--- |
| **Student** | `STU001` | `student123` | `/student-login` |
| **Invigilator** | `admin` | `admin123` | `/invigilator-login` |
