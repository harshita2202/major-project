package com.proctoring.proctoring_backend.controller;

import com.proctoring.proctoring_backend.model.Exam;
import com.proctoring.proctoring_backend.model.ExamSubmission;
import com.proctoring.proctoring_backend.model.Question;
import com.proctoring.proctoring_backend.model.SecurityEventEntity;
import com.proctoring.proctoring_backend.model.Violation;
import com.proctoring.proctoring_backend.repository.ExamRepository;
import com.proctoring.proctoring_backend.repository.ExamSubmissionRepository;
import com.proctoring.proctoring_backend.repository.QuestionRepository;
import com.proctoring.proctoring_backend.repository.SecurityEventRepository;
import com.proctoring.proctoring_backend.repository.ViolationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

    private final ExamRepository examRepository;
    private final QuestionRepository questionRepository;
    private final ExamSubmissionRepository submissionRepository;
    private final SecurityEventRepository securityEventRepository;
    private final ViolationRepository violationRepository;

    public ExamController(ExamRepository examRepository,
                          QuestionRepository questionRepository,
                          ExamSubmissionRepository submissionRepository,
                          SecurityEventRepository securityEventRepository,
                          ViolationRepository violationRepository) {
        this.examRepository = examRepository;
        this.questionRepository = questionRepository;
        this.submissionRepository = submissionRepository;
        this.securityEventRepository = securityEventRepository;
        this.violationRepository = violationRepository;
    }

    @GetMapping
    public List<Exam> getAllExams() {
        return examRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Exam> getExamById(@PathVariable String id) {
        return examRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Exam createExam(@RequestBody Map<String, Object> payload) {
        String id = (String) payload.getOrDefault("id", "exam-" + System.currentTimeMillis());
        String code = (String) payload.getOrDefault("code", "EXAM-" + (System.currentTimeMillis() % 10000));
        String name = (String) payload.getOrDefault("name", "Untitled Exam");
        String description = (String) payload.getOrDefault("description", "Scheduled examination.");
        String date = (String) payload.getOrDefault("date", "Upcoming");
        String time = (String) payload.getOrDefault("time", "10:00 AM");
        Object durationObj = payload.getOrDefault("duration", "60 mins");
        String duration = durationObj != null ? durationObj.toString() : "60 mins";
        if (!duration.toLowerCase().contains("min")) {
            duration += " mins";
        }
        int studentsCount = payload.containsKey("studentsCount") && payload.get("studentsCount") != null ? ((Number) payload.get("studentsCount")).intValue() : 0;
        String status = (String) payload.getOrDefault("status", "upcoming");
        String proctoringMode = (String) payload.getOrDefault("proctoringMode", "Strict AI");
        String type = (String) payload.getOrDefault("type", "mcq");
        int totalQuestions = payload.containsKey("totalQuestions") && payload.get("totalQuestions") != null ? ((Number) payload.get("totalQuestions")).intValue() : 0;

        Exam exam = new Exam(id, code, name, description, date, time, duration, studentsCount, status, proctoringMode, type, totalQuestions);
        return examRepository.save(exam);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExam(@PathVariable String id) {
        if (examRepository.existsById(id)) {
            examRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/{id}/questions")
    public List<Question> getExamQuestions(@PathVariable String id) {
        return questionRepository.findByExamId(id);
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<?> submitExam(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        String submissionId = "sub-" + UUID.randomUUID().toString().substring(0, 8);
        String studentId = (String) payload.getOrDefault("studentId", "STU001");
        String studentName = (String) payload.getOrDefault("studentName", "Student");
        Object answersObj = payload.get("answers");
        String answersJson = answersObj != null ? answersObj.toString() : "{}";
        int score = payload.containsKey("score") ? ((Number) payload.get("score")).intValue() : 0;
        int totalQuestions = payload.containsKey("totalQuestions") ? ((Number) payload.get("totalQuestions")).intValue() : 0;

        ExamSubmission submission = new ExamSubmission(
                submissionId,
                id,
                studentId,
                studentName,
                answersJson,
                score,
                totalQuestions,
                "submitted"
        );
        submissionRepository.save(submission);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("submissionId", submissionId);
        response.put("message", "Exam submitted successfully");
        response.put("score", score);
        response.put("totalQuestions", totalQuestions);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/events")
    public ResponseEntity<?> recordSecurityEvent(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        String eventId = "evt-" + UUID.randomUUID().toString().substring(0, 8);
        String studentId = (String) payload.getOrDefault("studentId", "STU001");
        String type = (String) payload.getOrDefault("type", "SECURITY_WARNING");
        String severity = (String) payload.getOrDefault("severity", "medium");
        String message = (String) payload.getOrDefault("message", "Security event recorded");

        SecurityEventEntity event = new SecurityEventEntity(eventId, id, studentId, type, severity, message);
        securityEventRepository.save(event);

        // Also record as a Violation for invigilator visibility
        String violId = "VIO-" + System.currentTimeMillis() % 100000;
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        String examTitle = examRepository.findById(id).map(Exam::getName).orElse(id);

        Violation violation = new Violation(
                violId,
                studentId,
                (String) payload.getOrDefault("studentName", "Alex Morgan"),
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
                examTitle,
                type,
                severity,
                now,
                "pending",
                message
        );
        violationRepository.save(violation);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("eventId", eventId);
        return ResponseEntity.ok(response);
    }
}
