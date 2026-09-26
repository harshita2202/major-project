package com.proctoring.proctoring_backend.controller;

import com.proctoring.proctoring_backend.entity.Candidate;
import com.proctoring.proctoring_backend.entity.Exam;
import com.proctoring.proctoring_backend.entity.Violation;
import com.proctoring.proctoring_backend.repository.CandidateRepository;
import com.proctoring.proctoring_backend.repository.ExamRepository;
import com.proctoring.proctoring_backend.repository.ViolationRepository;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final ExamRepository examRepository;
    private final CandidateRepository candidateRepository;
    private final ViolationRepository violationRepository;

    public DashboardController(ExamRepository examRepository,
                               CandidateRepository candidateRepository,
                               ViolationRepository violationRepository) {
        this.examRepository = examRepository;
        this.candidateRepository = candidateRepository;
        this.violationRepository = violationRepository;
    }

    @GetMapping("/stats")
    public Map<String, Object> getDashboardStats() {
        List<Exam> exams = examRepository.findAll();
        List<Candidate> candidates = candidateRepository.findAll();
        List<Violation> violations = violationRepository.findAll();

        long activeExams = exams.stream()
                .filter(e -> "active".equalsIgnoreCase(e.getStatus()) || "in-progress".equalsIgnoreCase(e.getStatus()) || "upcoming".equalsIgnoreCase(e.getStatus()))
                .count();
        if (activeExams == 0 && !exams.isEmpty()) {
            activeExams = exams.size();
        }

        long liveStudents = candidates.stream()
                .filter(c -> c.getId() != null && !c.getId().startsWith("cand-") && "active".equalsIgnoreCase(c.getStatus()))
                .count();

        long highRiskAlerts = violations.stream()
                .filter(v -> "high".equalsIgnoreCase(v.getSeverity()))
                .count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("activeExams", activeExams);
        stats.put("liveStudents", liveStudents);
        stats.put("flaggedIncidents", violations.size());
        stats.put("highRiskAlerts", highRiskAlerts);
        stats.put("systemHealth", "Optimal");

        return stats;
    }

    @GetMapping("/activity")
    public List<Map<String, Object>> getRecentActivity() {
        List<Violation> recentViolations = violationRepository.findTop10ByOrderByIdDesc();
        List<Map<String, Object>> activities = new ArrayList<>();

        for (Violation v : recentViolations) {
            Map<String, Object> act = new HashMap<>();
            act.put("id", v.getId());
            act.put("message", v.getCandidateName() + " - " + v.getType() + ": " + v.getDetails());
            act.put("type", "high".equalsIgnoreCase(v.getSeverity()) ? "warning" : "info");
            act.put("time", v.getTimestamp());
            activities.add(act);
        }

        if (activities.isEmpty()) {
            Map<String, Object> defaultAct = new HashMap<>();
            defaultAct.put("id", "act-1");
            defaultAct.put("message", "System integrity monitor initialized and operating normally.");
            defaultAct.put("type", "info");
            defaultAct.put("time", "Just now");
            activities.add(defaultAct);
        }

        return activities;
    }
}
