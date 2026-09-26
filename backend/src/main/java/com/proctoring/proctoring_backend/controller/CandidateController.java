package com.proctoring.proctoring_backend.controller;

import com.proctoring.proctoring_backend.dto.StartSessionRequest;
import com.proctoring.proctoring_backend.entity.Candidate;
import com.proctoring.proctoring_backend.entity.Exam;
import com.proctoring.proctoring_backend.repository.CandidateRepository;
import com.proctoring.proctoring_backend.repository.ExamRepository;
import com.proctoring.proctoring_backend.service.ExamSessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/candidates")
public class CandidateController {

    private final CandidateRepository candidateRepository;
    private final ExamRepository examRepository;
    private final ExamSessionService examSessionService;

    public CandidateController(CandidateRepository candidateRepository,
                               ExamRepository examRepository,
                               ExamSessionService examSessionService) {
        this.candidateRepository = candidateRepository;
        this.examRepository = examRepository;
        this.examSessionService = examSessionService;
    }

    /**
     * Returns ONLY students who are currently attempting their exams.
     * Excludes completed/disqualified students and hardcoded dummy candidates.
     */
    @GetMapping("/live")
    public List<Candidate> getLiveCandidates() {
        return candidateRepository.findByStatusIgnoreCase("active").stream()
                .filter(c -> c.getId() != null && !c.getId().startsWith("cand-"))
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Candidate> getCandidateById(@PathVariable String id) {
        return candidateRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Candidate saveCandidate(@RequestBody Candidate candidate) {
        return candidateRepository.save(candidate);
    }

    /**
     * Called when a student begins or resumes taking an exam.
     * Creates or updates the candidate with active status and starts an exam session.
     */
    @PostMapping("/start-attempt")
    public ResponseEntity<Candidate> startAttempt(@RequestBody Map<String, Object> payload) {
        String examId = (String) payload.getOrDefault("examId", "exam-1");
        String studentId = (String) payload.getOrDefault("studentId", "STU001");
        String studentName = (String) payload.getOrDefault("studentName", "Student");
        String email = (String) payload.getOrDefault("email", studentId.toLowerCase() + "@university.edu");
        String examTitle = (String) payload.getOrDefault("examTitle", null);

        if (examTitle == null || examTitle.trim().isEmpty()) {
            examTitle = examRepository.findById(examId).map(Exam::getName).orElse("Exam " + examId);
        }

        int timeRemaining = payload.containsKey("timeRemainingSeconds")
                ? ((Number) payload.get("timeRemainingSeconds")).intValue()
                : 5400;
        int totalDuration = payload.containsKey("totalDurationSeconds")
                ? ((Number) payload.get("totalDurationSeconds")).intValue()
                : timeRemaining;

        int h = timeRemaining / 3600;
        int m = (timeRemaining % 3600) / 60;
        int s = timeRemaining % 60;
        String formattedTime = String.format("%02d:%02d:%02d", h, m, s);

        int th = totalDuration / 3600;
        int tm = (totalDuration % 3600) / 60;
        int ts = totalDuration % 60;
        String formattedTotal = String.format("%02d:%02d:%02d", th, tm, ts);

        Candidate candidate = candidateRepository.findById(studentId).orElse(new Candidate());
        candidate.setId(studentId);
        candidate.setCandidate(studentName);
        if (candidate.getAvatar() == null || candidate.getAvatar().isEmpty()) {
            candidate.setAvatar(studentName.substring(0, Math.min(2, studentName.length())).toUpperCase());
        }
        candidate.setEmail(email);
        candidate.setExam(examTitle);
        candidate.setTimeRemaining(formattedTime);
        candidate.setTotalDuration(formattedTotal);
        candidate.setProgress(0);
        candidate.setStatus("active");
        candidate.setRisk("low");
        candidate.setRiskScore(0);
        if (candidate.getChecksJson() == null || candidate.getChecksJson().isEmpty()) {
            candidate.setChecksJson("{\"faceDetection\":\"passed\",\"audioLevel\":\"normal\",\"tabSwitches\":0,\"gazeTracking\":\"focused\"}");
        }
        if (candidate.getTimelineJson() == null || candidate.getTimelineJson().isEmpty()) {
            candidate.setTimelineJson("[]");
        }

        Candidate saved = candidateRepository.save(candidate);

        try {
            StartSessionRequest sessionReq = new StartSessionRequest(examId, studentId, studentName, timeRemaining);
            examSessionService.startSession(sessionReq);
        } catch (Exception ex) {
            System.err.println("Note: Sync exam session start: " + ex.getMessage());
        }

        return ResponseEntity.ok(saved);
    }

    /**
     * Updates candidate progress (time remaining, completion percentage).
     */
    @PostMapping("/update-progress")
    public ResponseEntity<Candidate> updateProgress(@RequestBody Map<String, Object> payload) {
        String studentId = (String) payload.get("studentId");
        if (studentId == null) return ResponseEntity.badRequest().build();

        return candidateRepository.findById(studentId).map(candidate -> {
            if (payload.containsKey("progress")) {
                candidate.setProgress(((Number) payload.get("progress")).intValue());
            }
            if (payload.containsKey("timeRemainingSeconds")) {
                int timeRemaining = ((Number) payload.get("timeRemainingSeconds")).intValue();
                int h = timeRemaining / 3600;
                int m = (timeRemaining % 3600) / 60;
                int s = timeRemaining % 60;
                candidate.setTimeRemaining(String.format("%02d:%02d:%02d", h, m, s));
            }
            if (payload.containsKey("status")) {
                candidate.setStatus((String) payload.get("status"));
            }
            return ResponseEntity.ok(candidateRepository.save(candidate));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Helper to purge legacy dummy candidates immediately.
     */
    @DeleteMapping("/clean-legacy")
    public ResponseEntity<?> cleanLegacyCandidates() {
        List<String> legacyIds = List.of("cand-1", "cand-2", "cand-3", "cand-4");
        for (String id : legacyIds) {
            if (candidateRepository.existsById(id)) {
                candidateRepository.deleteById(id);
            }
        }
        return ResponseEntity.ok(Map.of("success", true, "message", "Legacy hardcoded candidates removed."));
    }
}
