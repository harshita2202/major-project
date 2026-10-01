package com.proctoring.proctoring_backend.controller;

import com.proctoring.proctoring_backend.dto.ProctoringEventRequest;
import com.proctoring.proctoring_backend.dto.ProctoringEventResponse;
import com.proctoring.proctoring_backend.service.ProctoringEventService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ProctoringEventController {

    private final ProctoringEventService proctoringEventService;

    public ProctoringEventController(ProctoringEventService proctoringEventService) {
        this.proctoringEventService = proctoringEventService;
    }

    /**
     * General endpoint to record any proctoring event.
     * Especially: CLIPBOARD_PASTE_ATTEMPT, TAB_SWITCH, FULLSCREEN_EXIT
     */
    @PostMapping("/events")
    public ResponseEntity<ProctoringEventResponse> recordEvent(@RequestBody ProctoringEventRequest request) {
        if (request.getEventType() == null || request.getEventType().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        ProctoringEventResponse response = proctoringEventService.recordEvent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Session-scoped endpoint to record an event directly for a session.
     */
    @PostMapping("/sessions/{sessionId}/events")
    public ResponseEntity<ProctoringEventResponse> recordSessionEvent(
            @PathVariable String sessionId,
            @RequestBody ProctoringEventRequest request) {
        request.setSessionId(sessionId);
        ProctoringEventResponse response = proctoringEventService.recordEvent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Retrieve all proctoring events for a specific session.
     */
    @GetMapping("/sessions/{sessionId}/events")
    public List<ProctoringEventResponse> getEventsBySession(@PathVariable String sessionId) {
        return proctoringEventService.getEventsBySessionId(sessionId);
    }

    /**
     * Retrieve all proctoring events for an exam.
     */
    @GetMapping("/exams/{examId}/events-list")
    public List<ProctoringEventResponse> getEventsByExam(@PathVariable String examId) {
        return proctoringEventService.getEventsByExamId(examId);
    }
}
