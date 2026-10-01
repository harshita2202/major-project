package com.proctoring.proctoring_backend.controller;

import com.proctoring.proctoring_backend.dto.ExaminerLiveRiskResponse;
import com.proctoring.proctoring_backend.dto.SessionResponse;
import com.proctoring.proctoring_backend.dto.StartSessionRequest;
import com.proctoring.proctoring_backend.service.ExamSessionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sessions")
public class ExamSessionController {

    private final ExamSessionService examSessionService;

    public ExamSessionController(ExamSessionService examSessionService) {
        this.examSessionService = examSessionService;
    }

    /**
     * Start a new exam session or resume an existing active one.
     */
    @PostMapping("/start")
    public ResponseEntity<SessionResponse> startSession(@RequestBody StartSessionRequest request) {
        if (request.getExamId() == null || request.getCandidateId() == null) {
            return ResponseEntity.badRequest().build();
        }
        SessionResponse response = examSessionService.startSession(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Retrieve an existing session by session ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<SessionResponse> getSessionById(@PathVariable String id) {
        return examSessionService.getSessionById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Retrieve active session for candidate and exam if it exists.
     */
    @GetMapping("/active")
    public ResponseEntity<SessionResponse> getActiveSession(
            @RequestParam String candidateId,
            @RequestParam String examId) {
        return examSessionService.getActiveSession(candidateId, examId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Retrieve live risk dashboard grouping candidates by risk level.
     */
    @GetMapping("/live-risk")
    public ExaminerLiveRiskResponse getLiveRiskDashboard(@RequestParam(required = false) String examId) {
        return examSessionService.getLiveRiskDashboard(examId);
    }

    /**
     * Retrieve all sessions for a candidate.
     */
    @GetMapping("/candidate/{candidateId}")
    public List<SessionResponse> getSessionsByCandidate(@PathVariable String candidateId) {
        return examSessionService.getSessionsByCandidate(candidateId);
    }

    /**
     * Mark an exam session as completed.
     */
    @PostMapping("/{id}/complete")
    public ResponseEntity<SessionResponse> completeSession(@PathVariable String id) {
        return examSessionService.completeSession(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Update session progress (question index and remaining time).
     */
    @PutMapping("/{id}/progress")
    public ResponseEntity<SessionResponse> updateProgress(
            @PathVariable String id,
            @RequestBody Map<String, Object> payload) {
        Integer questionIndex = payload.containsKey("currentQuestionIndex") ?
                ((Number) payload.get("currentQuestionIndex")).intValue() : null;
        Integer timeRemaining = payload.containsKey("timeRemainingSeconds") ?
                ((Number) payload.get("timeRemainingSeconds")).intValue() : null;

        return examSessionService.updateProgress(id, questionIndex, timeRemaining)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
