package com.proctoring.proctoring_backend.controller;

import com.proctoring.proctoring_backend.entity.Exam;
import com.proctoring.proctoring_backend.entity.ExamSubmission;
import com.proctoring.proctoring_backend.entity.Question;
import com.proctoring.proctoring_backend.entity.SecurityEventEntity;
import com.proctoring.proctoring_backend.entity.Violation;
import com.proctoring.proctoring_backend.entity.Candidate;
import com.proctoring.proctoring_backend.repository.CandidateRepository;
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
    private final CandidateRepository candidateRepository;
    private final com.proctoring.proctoring_backend.service.ProctoringEventService proctoringEventService;

    public ExamController(ExamRepository examRepository,
                          QuestionRepository questionRepository,
                          ExamSubmissionRepository submissionRepository,
                          SecurityEventRepository securityEventRepository,
                          ViolationRepository violationRepository,
                          CandidateRepository candidateRepository,
                          com.proctoring.proctoring_backend.service.ProctoringEventService proctoringEventService) {
        this.examRepository = examRepository;
        this.questionRepository = questionRepository;
        this.submissionRepository = submissionRepository;
        this.securityEventRepository = securityEventRepository;
        this.violationRepository = violationRepository;
        this.candidateRepository = candidateRepository;
        this.proctoringEventService = proctoringEventService;
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
        String status = (String) payload.getOrDefault("status", "submitted");

        ExamSubmission submission = new ExamSubmission(
                submissionId,
                id,
                studentId,
                studentName,
                answersJson,
                score,
                totalQuestions,
                status
        );
        submissionRepository.save(submission);

        // Update candidate status if present
        candidateRepository.findById(studentId).ifPresent(candidate -> {
            candidate.setStatus("terminated".equalsIgnoreCase(status) ? "disqualified" : "completed");
            candidateRepository.save(candidate);
        });

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("submissionId", submissionId);
        response.put("message", "terminated".equalsIgnoreCase(status) ? "Exam terminated and recorded" : "Exam submitted successfully");
        response.put("score", score);
        response.put("totalQuestions", totalQuestions);
        response.put("status", status);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/events")
    public ResponseEntity<?> recordSecurityEvent(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        String studentId = (String) payload.getOrDefault("studentId", "STU001");
        String studentName = (String) payload.getOrDefault("studentName", "Alex Morgan");
        String type = (String) payload.getOrDefault("type", "SECURITY_WARNING");
        String severity = (String) payload.getOrDefault("severity", "medium");
        String message = (String) payload.getOrDefault("message", "Security event recorded");
        String sessionId = (String) payload.get("sessionId");

        com.proctoring.proctoring_backend.dto.ProctoringEventRequest eventReq =
                new com.proctoring.proctoring_backend.dto.ProctoringEventRequest();
        eventReq.setExamId(id);
        eventReq.setSessionId(sessionId);
        eventReq.setCandidateId(studentId);
        eventReq.setCandidateName(studentName);
        eventReq.setEventType(type);
        eventReq.setSeverity(severity);
        eventReq.setDetails(message);

        com.proctoring.proctoring_backend.dto.ProctoringEventResponse savedEvent =
                proctoringEventService.recordEvent(eventReq);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("eventId", savedEvent.getId());
        response.put("sessionId", savedEvent.getSessionId());
        return ResponseEntity.ok(response);
    }
}
