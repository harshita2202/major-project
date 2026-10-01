package com.proctoring.proctoring_backend.controller;

import com.proctoring.proctoring_backend.repository.ExamRepository;
import com.proctoring.proctoring_backend.repository.ExamSubmissionRepository;
import com.proctoring.proctoring_backend.repository.ViolationRepository;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ExamRepository examRepository;
    private final ViolationRepository violationRepository;
    private final ExamSubmissionRepository submissionRepository;

    public ReportController(ExamRepository examRepository,
                            ViolationRepository violationRepository,
                            ExamSubmissionRepository submissionRepository) {
        this.examRepository = examRepository;
        this.violationRepository = violationRepository;
        this.submissionRepository = submissionRepository;
    }

    @GetMapping("/summary")
    public Map<String, Object> getReportSummary() {
        long totalExams = examRepository.count();
        long totalViolations = violationRepository.count();
        long totalSubmissions = submissionRepository.count();

        // Calculate a dynamic integrity score
        int integrityScore = 98;
        if (totalViolations > 0) {
            integrityScore = Math.max(75, 98 - (int)(totalViolations * 2));
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalExams", totalExams);
        summary.put("totalViolations", totalViolations);
        summary.put("totalSubmissions", totalSubmissions);
        summary.put("integrityScore", integrityScore + "%");
        summary.put("flaggedCandidates", violationRepository.findAll().stream().map(v -> v.getCandidateId()).distinct().count());
        return summary;
    }
}
