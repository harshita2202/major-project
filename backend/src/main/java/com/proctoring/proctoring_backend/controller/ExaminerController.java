package com.proctoring.proctoring_backend.controller;

import com.proctoring.proctoring_backend.dto.ExaminerLiveRiskResponse;
import com.proctoring.proctoring_backend.service.ExamSessionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/examiner")
public class ExaminerController {

    private final ExamSessionService examSessionService;

    public ExaminerController(ExamSessionService examSessionService) {
        this.examSessionService = examSessionService;
    }

    /**
     * Get candidates grouped by risk level (HIGH, MEDIUM, LOW),
     * sorted by risk score descending within each tier.
     * Optionally filterable by examId.
     */
    @GetMapping("/live-risk")
    public ExaminerLiveRiskResponse getLiveRiskDashboard(@RequestParam(required = false) String examId) {
        return examSessionService.getLiveRiskDashboard(examId);
    }
}
