package com.proctoring.proctoring_backend.controller;

import com.proctoring.proctoring_backend.entity.*;
import com.proctoring.proctoring_backend.repository.*;
import com.proctoring.proctoring_backend.service.CodeEvaluationService;
import com.proctoring.proctoring_backend.service.ExamAvailabilityService;
import com.proctoring.proctoring_backend.service.ProctoringEventService;
import com.proctoring.proctoring_backend.util.JsonUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import tools.jackson.core.type.TypeReference;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/exams")
public class ExamController {

    private final ExamRepository examRepository;
    private final QuestionRepository questionRepository;
    private final ExamSubmissionRepository submissionRepository;
    private final SecurityEventRepository securityEventRepository;
    private final ViolationRepository violationRepository;
    private final CandidateRepository candidateRepository;
    private final ExamAssignmentRepository examAssignmentRepository;
    private final TestCaseRepository testCaseRepository;
    private final StudentRepository studentRepository;
    private final ExamSessionRepository examSessionRepository;
    private final ProctoringEventRepository proctoringEventRepository;
    private final ProctoringEventService proctoringEventService;
    private final CodeEvaluationService codeEvaluationService;
    private final ExamAvailabilityService examAvailabilityService;

    public ExamController(ExamRepository examRepository,
                          QuestionRepository questionRepository,
                          ExamSubmissionRepository submissionRepository,
                          SecurityEventRepository securityEventRepository,
                          ViolationRepository violationRepository,
                          CandidateRepository candidateRepository,
                          ExamAssignmentRepository examAssignmentRepository,
                          TestCaseRepository testCaseRepository,
                          StudentRepository studentRepository,
                          ExamSessionRepository examSessionRepository,
                          ProctoringEventRepository proctoringEventRepository,
                          ProctoringEventService proctoringEventService,
                          CodeEvaluationService codeEvaluationService,
                          ExamAvailabilityService examAvailabilityService) {
        this.examRepository = examRepository;
        this.questionRepository = questionRepository;
        this.submissionRepository = submissionRepository;
        this.securityEventRepository = securityEventRepository;
        this.violationRepository = violationRepository;
        this.candidateRepository = candidateRepository;
        this.examAssignmentRepository = examAssignmentRepository;
        this.testCaseRepository = testCaseRepository;
        this.studentRepository = studentRepository;
        this.examSessionRepository = examSessionRepository;
        this.proctoringEventRepository = proctoringEventRepository;
        this.proctoringEventService = proctoringEventService;
        this.codeEvaluationService = codeEvaluationService;
        this.examAvailabilityService = examAvailabilityService;
    }

    /**
     * Get all exams, or filter by student assignment if studentId provided.
     */
    @GetMapping
    public List<Map<String, Object>> getAllExams(@RequestParam(required = false) String studentId,
                                                 @RequestParam(required = false) String status) {
        List<Exam> exams;
        if (studentId != null && !studentId.trim().isEmpty()) {
            List<ExamAssignment> assignments = examAssignmentRepository.findByStudentId(studentId.trim());
            Set<String> assignedExamIds = assignments.stream().map(ExamAssignment::getExamId).collect(Collectors.toSet());

            // If no specific assignment records exist in table for this student (e.g. legacy STU001-STU005 on default seeds),
            // auto-include default seeds so legacy test flows are preserved
            boolean isDemoStudent = studentId.toUpperCase().startsWith("STU00");

            exams = examRepository.findAll().stream()
                    .filter(e -> !"draft".equalsIgnoreCase(e.getStatus()))
                    .filter(e -> assignedExamIds.contains(e.getId()) || (isDemoStudent && e.getId().startsWith("exam-")))
                    .toList();
        } else if (status != null && !status.trim().isEmpty()) {
            exams = examRepository.findAll().stream()
                    .filter(e -> status.equalsIgnoreCase(e.getStatus()))
                    .toList();
        } else {
            exams = examRepository.findAll();
        }

        return exams.stream().map(this::enrichExamMetadata).toList();
    }

    /**
     * Get exams assigned to a specific student (convenience endpoint).
     */
    @GetMapping("/student/{studentId}")
    public List<Map<String, Object>> getStudentExams(@PathVariable String studentId) {
        return getAllExams(studentId, null);
    }

    @GetMapping("/submissions")
    public List<ExamSubmission> getSubmissions(@RequestParam(required = false) String studentId) {
        if (studentId != null && !studentId.trim().isEmpty()) {
            return submissionRepository.findByStudentId(studentId);
        }
        return submissionRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getExamById(@PathVariable String id) {
        return examRepository.findById(id)
                .map(exam -> ResponseEntity.ok(enrichExamMetadata(exam)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Create or update a complete exam with basic details, questions, test cases, and student assignments.
     */
    @PostMapping
    @Transactional
    public ResponseEntity<?> createExam(@RequestBody Map<String, Object> payload) {
        try {
            String id = (String) payload.getOrDefault("id", "exam-" + System.currentTimeMillis());
            String code = (String) payload.getOrDefault("code", "EXAM-" + (System.currentTimeMillis() % 10000));
            String name = (String) payload.getOrDefault("name", "Untitled Exam");
            String description = (String) payload.getOrDefault("description", "Scheduled examination.");
            String date = (String) payload.getOrDefault("date", "Today");
            String time = (String) payload.getOrDefault("time", "10:00 AM");

            Object durationObj = payload.getOrDefault("duration", "60 mins");
            String duration = durationObj != null ? durationObj.toString() : "60 mins";
            if (!duration.toLowerCase().contains("min")) {
                duration += " mins";
            }

            int durationMinutes = 60;
            if (payload.containsKey("durationMinutes") && payload.get("durationMinutes") != null) {
                durationMinutes = ((Number) payload.get("durationMinutes")).intValue();
            } else if (payload.containsKey("duration") && payload.get("duration") != null) {
                try {
                    String durStr = payload.get("duration").toString().replaceAll("[^0-9]", "");
                    if (!durStr.isEmpty()) durationMinutes = Integer.parseInt(durStr);
                } catch (Exception ignored) {}
            }

            String startTime = (String) payload.getOrDefault("startTime", time);
            String endTime = (String) payload.getOrDefault("endTime", "02:00 PM");
            String windowStartDate = (String) payload.getOrDefault("windowStartDate", date);
            String windowEndDate = (String) payload.getOrDefault("windowEndDate", date);
            String instructions = (String) payload.getOrDefault("instructions", "Read all instructions carefully.");
            String proctoringMode = (String) payload.getOrDefault("proctoringMode", "Strict AI");
            String type = (String) payload.getOrDefault("type", "mcq");
            String status = (String) payload.getOrDefault("status", "draft");

            // Process Questions List
            List<?> questionsRaw = payload.containsKey("questions") ? (List<?>) payload.get("questions") : Collections.emptyList();
            List<Question> savedQuestions = new ArrayList<>();
            List<TestCase> savedTestCases = new ArrayList<>();

            int totalCalculatedMarks = 0;
            int order = 0;

            // Delete previous questions and test cases if updating existing exam
            testCaseRepository.deleteByExamId(id);
            List<Question> existingQs = questionRepository.findByExamId(id);
            for (Question eq : existingQs) {
                testCaseRepository.deleteByQuestionId(eq.getId());
            }
            questionRepository.deleteAll(existingQs);

            for (Object qObj : questionsRaw) {
                if (!(qObj instanceof Map<?, ?> rawMap)) continue;
                Map<String, Object> qMap = new HashMap<>();
                rawMap.forEach((k, v) -> qMap.put(String.valueOf(k), v));

                String qId = (String) qMap.getOrDefault("id", "q-" + UUID.randomUUID().toString().substring(0, 8));
                String qType = (String) qMap.getOrDefault("type", "mcq");
                String qTitle = (String) qMap.getOrDefault("title", "Question " + (order + 1));
                String qText = (String) qMap.getOrDefault("question", "");
                int qMarks = qMap.containsKey("marks") && qMap.get("marks") != null ? ((Number) qMap.get("marks")).intValue() : 5;
                String difficulty = (String) qMap.getOrDefault("difficulty", "Medium");
                String explanation = (String) qMap.getOrDefault("explanation", "");

                totalCalculatedMarks += qMarks;

                Question question = new Question();
                question.setId(qId);
                question.setExamId(id);
                question.setType(qType.toLowerCase());
                question.setTitle(qTitle);
                question.setQuestion(qText);
                question.setMarks(qMarks);
                question.setDifficulty(difficulty);
                question.setExplanation(explanation);
                question.setOrderIndex(order++);

                if ("coding".equalsIgnoreCase(qType)) {
                    question.setInputFormat((String) qMap.getOrDefault("inputFormat", ""));
                    question.setOutputFormat((String) qMap.getOrDefault("outputFormat", ""));
                    question.setAllowedLanguages((String) qMap.getOrDefault("allowedLanguages", "javascript,python,java"));

                    Object constraints = qMap.get("constraints");
                    if (constraints instanceof List) {
                        question.setConstraintsJson(JsonUtil.toJson(constraints));
                    } else if (constraints != null) {
                        question.setConstraintsJson(constraints.toString());
                    }

                    Object examples = qMap.get("examples");
                    if (examples != null) {
                        question.setExamplesJson(examples instanceof String ? (String) examples : JsonUtil.toJson(examples));
                    }

                    Object starterCode = qMap.get("starterCode");
                    if (starterCode != null) {
                        question.setStarterCodeJson(starterCode instanceof String ? (String) starterCode : JsonUtil.toJson(starterCode));
                    } else {
                        question.setStarterCodeJson("{\"javascript\":\"// Write solution here\",\"python\":\"# Write solution here\"}");
                    }

                    // Process Test Cases from testCases, sampleTestCases, and hiddenTestCases
                    List<Object> allTestCasesRaw = new ArrayList<>();
                    if (qMap.get("testCases") instanceof List<?> list) {
                        allTestCasesRaw.addAll(list);
                    }
                    if (qMap.get("sampleTestCases") instanceof List<?> list) {
                        for (Object o : list) {
                            if (o instanceof Map<?, ?> m) {
                                Map<String, Object> copy = new HashMap<>();
                                m.forEach((k, v) -> copy.put(String.valueOf(k), v));
                                copy.put("isSample", true);
                                allTestCasesRaw.add(copy);
                            }
                        }
                    }
                    if (qMap.get("hiddenTestCases") instanceof List<?> list) {
                        for (Object o : list) {
                            if (o instanceof Map<?, ?> m) {
                                Map<String, Object> copy = new HashMap<>();
                                m.forEach((k, v) -> copy.put(String.valueOf(k), v));
                                copy.put("isSample", false);
                                allTestCasesRaw.add(copy);
                            }
                        }
                    }

                    int tcOrder = 0;
                    for (Object tcObj : allTestCasesRaw) {
                        if (!(tcObj instanceof Map<?, ?> rawTc)) continue;
                        Map<String, Object> tcMap = new HashMap<>();
                        rawTc.forEach((k, v) -> tcMap.put(String.valueOf(k), v));

                        String tcId = (String) tcMap.getOrDefault("id", "tc-" + UUID.randomUUID().toString().substring(0, 8));
                        String tcInput = (String) tcMap.getOrDefault("input", "");
                        String tcExpected = (String) tcMap.getOrDefault("expectedOutput", "");
                        boolean isSample = Boolean.TRUE.equals(tcMap.get("isSample"));
                        int tcMarks = tcMap.containsKey("marks") && tcMap.get("marks") != null ? ((Number) tcMap.get("marks")).intValue() : 1;

                        TestCase tc = new TestCase(tcId, qId, id, tcInput, tcExpected, isSample, tcMarks, tcOrder++);
                        savedTestCases.add(tc);
                    }
                } else {
                    // MCQ Question
                    Object optionsObj = qMap.get("options");
                    if (optionsObj == null) {
                        optionsObj = qMap.get("optionsJson");
                    }
                    if (optionsObj instanceof List) {
                        question.setOptionsJson(JsonUtil.toJson(optionsObj));
                    } else if (optionsObj != null) {
                        question.setOptionsJson(optionsObj.toString());
                    } else {
                        question.setOptionsJson("[\"Option A\",\"Option B\",\"Option C\",\"Option D\"]");
                    }

                    Integer correctIdx = null;
                    if (qMap.containsKey("correctIndex") && qMap.get("correctIndex") != null) {
                        correctIdx = ((Number) qMap.get("correctIndex")).intValue();
                    } else if (qMap.containsKey("correctAnswer") && qMap.get("correctAnswer") != null) {
                        try {
                            correctIdx = Integer.parseInt(qMap.get("correctAnswer").toString());
                        } catch (Exception ignored) {}
                    }
                    question.setCorrectIndex(correctIdx);
                }

                savedQuestions.add(question);
            }

            questionRepository.saveAll(savedQuestions);
            if (!savedTestCases.isEmpty()) {
                testCaseRepository.saveAll(savedTestCases);
            }

            // Process Assigned Students
            List<?> assignedRaw = payload.containsKey("assignedStudents") ? (List<?>) payload.get("assignedStudents") : Collections.emptyList();
            examAssignmentRepository.deleteByExamId(id);
            List<ExamAssignment> savedAssignments = new ArrayList<>();

            for (Object stObj : assignedRaw) {
                String stId = null;
                String stName = null;
                String stEmail = null;

                if (stObj instanceof Map<?, ?> rawSt) {
                    Map<String, Object> stMap = new HashMap<>();
                    rawSt.forEach((k, v) -> stMap.put(String.valueOf(k), v));
                    stId = (String) stMap.getOrDefault("id", stMap.get("studentId"));
                    stName = (String) stMap.getOrDefault("name", stMap.get("studentName"));
                    stEmail = (String) stMap.getOrDefault("email", stMap.get("studentEmail"));
                } else if (stObj instanceof String sStr) {
                    stId = sStr;
                }

                if (stId != null && !stId.trim().isEmpty()) {
                    if (stName == null || stName.isEmpty()) {
                        stName = studentRepository.findById(stId).map(Student::getName).orElse("Student " + stId);
                    }
                    if (stEmail == null || stEmail.isEmpty()) {
                        stEmail = studentRepository.findById(stId).map(Student::getEmail).orElse(stId.toLowerCase() + "@university.edu");
                    }

                    ExamAssignment asgn = new ExamAssignment("asgn-" + UUID.randomUUID().toString().substring(0, 8), id, stId, stName, stEmail);
                    savedAssignments.add(asgn);

                    // Ensure student exists in StudentRepository for consistency
                    if (!studentRepository.existsById(stId)) {
                        studentRepository.save(new Student(stId, stName, stEmail, name, "Active", "low", "Just assigned"));
                    }
                }
            }

            if (!savedAssignments.isEmpty()) {
                examAssignmentRepository.saveAll(savedAssignments);
            }

            // Save Exam
            int studentsCount = savedAssignments.size();
            int totalQuestions = savedQuestions.size();

            Exam exam = examRepository.findById(id).orElse(new Exam());
            exam.setId(id);
            exam.setCode(code);
            exam.setName(name);
            exam.setDescription(description);
            exam.setDate(date);
            exam.setTime(time);
            exam.setDuration(duration);
            exam.setDurationMinutes(durationMinutes);
            exam.setStartTime(startTime);
            exam.setEndTime(endTime);
            exam.setWindowStartDate(windowStartDate);
            exam.setWindowEndDate(windowEndDate);
            exam.setInstructions(instructions);
            exam.setProctoringMode(proctoringMode);
            exam.setType(type.toLowerCase());
            exam.setStatus(status.toLowerCase());
            exam.setStudentsCount(studentsCount);
            exam.setTotalQuestions(totalQuestions);
            exam.setTotalMarks(totalCalculatedMarks);

            Exam savedExam = examRepository.save(exam);

            Map<String, Object> resp = enrichExamMetadata(savedExam);
            resp.put("questionsCount", totalQuestions);
            resp.put("assignedStudentsCount", studentsCount);
            resp.put("message", "Exam " + ("published".equalsIgnoreCase(status) ? "published" : "saved as draft") + " successfully");
            return ResponseEntity.ok(resp);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to save exam: " + e.getMessage()));
        }
    }

    /**
     * Publish an exam with strict validation.
     */
    @PostMapping("/{id}/publish")
    public ResponseEntity<?> publishExam(@PathVariable String id) {
        Optional<Exam> examOpt = examRepository.findById(id);
        if (examOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Exam exam = examOpt.get();

        // Validation checks
        List<String> errors = new ArrayList<>();
        if (exam.getName() == null || exam.getName().trim().isEmpty() || exam.getName().equalsIgnoreCase("Untitled Exam")) {
            errors.add("Exam title is required.");
        }
        if (exam.getDurationMinutes() <= 0) {
            errors.add("Exam duration must be greater than 0 minutes.");
        }

        List<Question> questions = questionRepository.findByExamId(id);
        if (questions.isEmpty()) {
            errors.add("Cannot publish exam without questions. Please add at least one question.");
        } else {
            for (Question q : questions) {
                if ("mcq".equalsIgnoreCase(q.getType())) {
                    if (q.getCorrectIndex() == null) {
                        errors.add("MCQ '" + q.getTitle() + "' does not have a correct answer selected.");
                    }
                } else if ("coding".equalsIgnoreCase(q.getType())) {
                    List<TestCase> testCases = testCaseRepository.findByQuestionIdOrderByOrderIndexAsc(q.getId());
                    if (testCases.isEmpty()) {
                        errors.add("Coding problem '" + q.getTitle() + "' must have at least one test case.");
                    }
                }
            }
        }

        List<ExamAssignment> assignments = examAssignmentRepository.findByExamId(id);
        if (assignments.isEmpty()) {
            errors.add("Cannot publish exam without assigned students. Please select or add students.");
        }

        if (!errors.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", "Validation failed. Please resolve all issues before publishing.",
                    "errors", errors
            ));
        }

        exam.setStatus("published");
        examRepository.save(exam);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Exam published successfully! Assigned students can now view it according to its availability window.",
                "exam", enrichExamMetadata(exam)
        ));
    }

    /**
     * Revert exam to draft.
     */
    @PostMapping("/{id}/draft")
    public ResponseEntity<?> saveExamAsDraft(@PathVariable String id) {
        return examRepository.findById(id).map(exam -> {
            exam.setStatus("draft");
            examRepository.save(exam);
            return ResponseEntity.ok(Map.of("success", true, "message", "Exam moved to draft state.", "exam", enrichExamMetadata(exam)));
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Delete an exam and all dependent questions, test cases, and assignments.
     */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteExam(@PathVariable String id) {
        if (examRepository.existsById(id)) {
            testCaseRepository.deleteByExamId(id);
            List<Question> questions = questionRepository.findByExamId(id);
            for (Question q : questions) {
                testCaseRepository.deleteByQuestionId(q.getId());
            }
            questionRepository.deleteAll(questions);
            examAssignmentRepository.deleteByExamId(id);
            examRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Get exam questions.
     * If requested by student (or studentId provided):
     * - Verifies assignment (403 if not assigned).
     * - Strips correctIndex and explanation from MCQs.
     * - Strips hidden test cases from coding questions.
     */
    @GetMapping("/{id}/questions")
    public ResponseEntity<?> getExamQuestions(@PathVariable String id,
                                              @RequestParam(required = false) String studentId,
                                              @RequestParam(required = false) String role) {
        Optional<Exam> examOpt = examRepository.findById(id);
        if (examOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Exam exam = examOpt.get();

        boolean isStudent = (role == null || !"admin".equalsIgnoreCase(role)) && (studentId != null && !studentId.isEmpty());

        if (isStudent) {
            // Verify student assignment
            List<ExamAssignment> assignments = examAssignmentRepository.findByExamId(id);
            if (!assignments.isEmpty()) {
                boolean assigned = examAssignmentRepository.existsByExamIdAndStudentId(id, studentId);
                if (!assigned) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: You are not assigned to this examination."));
                }
            }

            // Check availability window
            ExamAvailabilityService.WindowStatus windowStatus = examAvailabilityService.getWindowStatus(exam);
            if (windowStatus == ExamAvailabilityService.WindowStatus.UPCOMING) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "Exam has not started yet. Opens at " + (exam.getStartTime() != null ? exam.getStartTime() : exam.getTime())));
            }
            if (windowStatus == ExamAvailabilityService.WindowStatus.CLOSED) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("error", "The exam availability window has closed."));
            }
        }

        List<Question> questions = questionRepository.findByExamId(id);
        questions.sort(Comparator.comparingInt(Question::getOrderIndex));

        // Format and sanitize questions
        List<Map<String, Object>> responseList = new ArrayList<>();
        for (Question q : questions) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", q.getId());
            map.put("examId", q.getExamId());
            map.put("type", q.getType());
            map.put("title", q.getTitle());
            map.put("question", q.getQuestion());
            map.put("marks", q.getMarks());
            map.put("difficulty", q.getDifficulty());

            // MCQ Options
            try {
                if (q.getOptionsJson() != null && !q.getOptionsJson().isEmpty()) {
                    List<String> options = JsonUtil.fromJson(q.getOptionsJson(), new TypeReference<List<String>>() {});
                    map.put("options", options);
                }
            } catch (Exception ignored) {}

            // Admin gets correctIndex and explanation; Students DO NOT!
            if (!isStudent) {
                map.put("correctIndex", q.getCorrectIndex());
                map.put("explanation", q.getExplanation());
            }

            // Coding specifics
            if ("coding".equalsIgnoreCase(q.getType())) {
                map.put("inputFormat", q.getInputFormat());
                map.put("outputFormat", q.getOutputFormat());
                map.put("allowedLanguages", q.getAllowedLanguages());

                try {
                    if (q.getConstraintsJson() != null && !q.getConstraintsJson().isEmpty()) {
                        map.put("constraints", JsonUtil.fromJson(q.getConstraintsJson(), Object.class));
                    }
                } catch (Exception ignored) {}

                try {
                    if (q.getExamplesJson() != null && !q.getExamplesJson().isEmpty()) {
                        map.put("examples", JsonUtil.fromJson(q.getExamplesJson(), Object.class));
                    }
                } catch (Exception ignored) {}

                try {
                    if (q.getStarterCodeJson() != null && !q.getStarterCodeJson().isEmpty()) {
                        map.put("starterCode", JsonUtil.fromJson(q.getStarterCodeJson(), Object.class));
                    }
                } catch (Exception ignored) {}

                // Test cases
                List<TestCase> testCases = testCaseRepository.findByQuestionIdOrderByOrderIndexAsc(q.getId());
                if (isStudent) {
                    // Only return sample test cases to student; NEVER hidden test cases
                    List<Map<String, Object>> sampleCases = testCases.stream()
                            .filter(TestCase::isSample)
                            .map(tc -> {
                                Map<String, Object> m = new HashMap<>();
                                m.put("id", tc.getId());
                                m.put("input", tc.getInput());
                                m.put("expectedOutput", tc.getExpectedOutput());
                                m.put("isSample", true);
                                return m;
                            })
                            .toList();
                    map.put("testCases", sampleCases);
                } else {
                    // Admin gets all test cases
                    map.put("testCases", testCases);
                }
            }

            responseList.add(map);
        }

        return ResponseEntity.ok(responseList);
    }

    /**
     * Get assigned students for an exam.
     */
    @GetMapping("/{id}/assignments")
    public List<ExamAssignment> getExamAssignments(@PathVariable String id) {
        return examAssignmentRepository.findByExamId(id);
    }

    /**
     * Run student code against sample test cases (interactive tester).
     */
    @PostMapping("/{id}/run-code")
    public ResponseEntity<?> runSampleTestCases(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        String questionId = (String) payload.get("questionId");
        String sourceCode = (String) payload.get("sourceCode");
        String language = (String) payload.getOrDefault("language", "javascript");

        List<TestCase> sampleTestCases = testCaseRepository.findByQuestionIdAndIsSampleTrueOrderByOrderIndexAsc(questionId);
        if (sampleTestCases.isEmpty()) {
            sampleTestCases = testCaseRepository.findByQuestionIdOrderByOrderIndexAsc(questionId).stream()
                    .limit(2)
                    .toList();
        }

        CodeEvaluationService.CodeEvaluationSummary summary = codeEvaluationService.evaluate(language, sourceCode, sampleTestCases, 10);
        return ResponseEntity.ok(summary);
    }

    /**
     * Submit Exam: dynamic scoring across MCQs and Coding test cases with proctoring integration.
     */
    @PostMapping("/{id}/submit")
    @Transactional
    public ResponseEntity<?> submitExam(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        Optional<Exam> examOpt = examRepository.findById(id);
        Exam exam = examOpt.orElse(null);

        String submissionId = "sub-" + UUID.randomUUID().toString().substring(0, 8);
        String studentId = (String) payload.getOrDefault("studentId", "STU001");
        String studentName = (String) payload.getOrDefault("studentName", "Student");
        String sessionId = (String) payload.get("sessionId");
        boolean autoSubmitted = Boolean.TRUE.equals(payload.get("autoSubmitted"));
        String submissionReason = (String) payload.getOrDefault("submissionReason", autoSubmitted ? "CHEATING_RISK_THRESHOLD_REACHED" : "Normal candidate submission");
        String status = (String) payload.getOrDefault("status", autoSubmitted ? "auto_submitted" : "completed");

        Object answersObj = payload.get("answers");
        Map<String, Object> answersMap = new HashMap<>();
        if (answersObj instanceof Map<?, ?> rawAns) {
            rawAns.forEach((k, v) -> answersMap.put(String.valueOf(k), v));
        }

        // Fetch questions for this exam to evaluate on backend
        List<Question> questions = questionRepository.findByExamId(id);
        int totalMarks = exam != null && exam.getTotalMarks() > 0 ? exam.getTotalMarks() : 0;
        if (totalMarks == 0) {
            totalMarks = questions.stream().mapToInt(Question::getMarks).sum();
        }
        if (totalMarks == 0) totalMarks = questions.size() * 5;

        int mcqEarned = 0;
        int codingEarned = 0;
        Map<String, Object> codingProblemResults = new HashMap<>();

        for (Question q : questions) {
            Object studentAns = answersMap.get(q.getId());

            if ("coding".equalsIgnoreCase(q.getType())) {
                String code = studentAns instanceof String ? (String) studentAns : "";
                List<TestCase> testCases = testCaseRepository.findByQuestionIdOrderByOrderIndexAsc(q.getId());
                CodeEvaluationService.CodeEvaluationSummary eval = codeEvaluationService.evaluate("javascript", code, testCases, q.getMarks());
                codingEarned += eval.getMarksEarned();

                Map<String, Object> problemRes = new HashMap<>();
                problemRes.put("questionTitle", q.getTitle());
                problemRes.put("marksEarned", eval.getMarksEarned());
                problemRes.put("totalMarks", q.getMarks());
                problemRes.put("passedTestCases", eval.getPassedTestCases());
                problemRes.put("totalTestCases", eval.getTotalTestCases());
                problemRes.put("submittedCode", code);
                codingProblemResults.put(q.getId(), problemRes);
            } else {
                // MCQ evaluation
                if (studentAns != null && q.getCorrectIndex() != null) {
                    try {
                        int selected = Integer.parseInt(studentAns.toString());
                        if (selected == q.getCorrectIndex()) {
                            mcqEarned += q.getMarks();
                        }
                    } catch (Exception ignored) {}
                }
            }
        }

        int finalScore = mcqEarned + codingEarned;

        // Fetch Session / Candidate proctoring data
        int finalRiskScore = payload.containsKey("riskScore") ? ((Number) payload.get("riskScore")).intValue() : 0;
        String finalRiskLevel = (String) payload.getOrDefault("riskLevel", "LOW");
        boolean cheatingFlag = Boolean.TRUE.equals(payload.get("cheatingFlag"));

        if (sessionId != null) {
            examSessionRepository.findById(sessionId).ifPresent(s -> {
                s.setStatus(autoSubmitted ? "AUTO_SUBMITTED" : "COMPLETED");
                s.setEndTime(LocalDateTime.now());
                s.setTimeRemainingSeconds(0);
                examSessionRepository.save(s);
            });
        }

        Optional<Candidate> candOpt = candidateRepository.findById(studentId);
        if (candOpt.isPresent()) {
            Candidate c = candOpt.get();
            finalRiskScore = Math.max(finalRiskScore, c.getRiskScore());
            if (c.getRisk() != null) finalRiskLevel = c.getRisk().toUpperCase();
            if (c.isCheatingFlag()) cheatingFlag = true;
            c.setStatus(autoSubmitted ? "disqualified" : "completed");
            candidateRepository.save(c);
        }

        if (finalRiskScore >= 80) {
            finalRiskLevel = "HIGH";
            cheatingFlag = true;
        }

        // Summary of proctoring events
        List<ProctoringEvent> events = sessionId != null
                ? proctoringEventRepository.findBySessionIdOrderByTimestampDesc(sessionId)
                : Collections.emptyList();

        Map<String, Integer> eventCounts = new HashMap<>();
        for (ProctoringEvent ev : events) {
            eventCounts.put(ev.getEventType(), eventCounts.getOrDefault(ev.getEventType(), 0) + 1);
        }

        ExamSubmission submission = new ExamSubmission();
        submission.setId(submissionId);
        submission.setExamId(id);
        submission.setStudentId(studentId);
        submission.setStudentName(studentName);

        Map<String, Object> proctoringSummary = new HashMap<>();
        proctoringSummary.put("eventCounts", eventCounts);
        proctoringSummary.put("finalRiskScore", finalRiskScore);
        proctoringSummary.put("finalRiskLevel", finalRiskLevel);
        proctoringSummary.put("cheatingFlag", cheatingFlag);

        submission.setAnswersJson(JsonUtil.toJson(answersMap));
        submission.setCodingResultsJson(JsonUtil.toJson(codingProblemResults));
        submission.setProctoringSummaryJson(JsonUtil.toJson(proctoringSummary));

        submission.setScore(finalScore);
        submission.setTotalQuestions(questions.size());
        submission.setTotalMarks(totalMarks);
        submission.setMcqScore(mcqEarned);
        submission.setCodingScore(codingEarned);
        submission.setSubmittedAt(LocalDateTime.now());
        submission.setStatus(status);
        submission.setAutoSubmitted(autoSubmitted);
        submission.setSubmissionReason(submissionReason);
        submission.setFinalRiskScore(finalRiskScore);
        submission.setFinalRiskLevel(finalRiskLevel);
        submission.setCheatingFlag(cheatingFlag);

        submissionRepository.save(submission);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("submissionId", submissionId);
        response.put("score", finalScore);
        response.put("totalMarks", totalMarks);
        response.put("mcqScore", mcqEarned);
        response.put("codingScore", codingEarned);
        response.put("totalQuestions", questions.size());
        response.put("status", status);
        response.put("autoSubmitted", autoSubmitted);
        response.put("finalRiskScore", finalRiskScore);
        response.put("finalRiskLevel", finalRiskLevel);
        response.put("cheatingFlag", cheatingFlag);
        response.put("message", autoSubmitted
                ? "Exam automatically submitted due to risk threshold violation"
                : "Examination completed and successfully submitted");

        return ResponseEntity.ok(response);
    }

    /**
     * Admin Exam Details & Complete Student Results Page.
     */
    @GetMapping("/{id}/results")
    public ResponseEntity<?> getExamResults(@PathVariable String id) {
        Optional<Exam> examOpt = examRepository.findById(id);
        if (examOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Exam exam = examOpt.get();

        List<ExamAssignment> assignments = examAssignmentRepository.findByExamId(id);
        List<ExamSubmission> submissions = submissionRepository.findByExamId(id);

        Map<String, ExamSubmission> submissionByStudent = new HashMap<>();
        for (ExamSubmission sub : submissions) {
            submissionByStudent.put(sub.getStudentId(), sub);
        }

        List<Map<String, Object>> studentResults = new ArrayList<>();
        int completedCount = 0;
        int autoSubmittedCount = 0;
        int inProgressCount = 0;
        int unattemptedCount = 0;
        int highRiskCount = 0;
        int sumScores = 0;

        Set<String> processedStudentIds = new HashSet<>();

        for (ExamAssignment asgn : assignments) {
            processedStudentIds.add(asgn.getStudentId());
            ExamSubmission sub = submissionByStudent.get(asgn.getStudentId());

            Map<String, Object> res = new HashMap<>();
            res.put("studentId", asgn.getStudentId());
            res.put("studentName", asgn.getStudentName());
            res.put("studentEmail", asgn.getStudentEmail());

            if (sub != null) {
                res.put("status", sub.isAutoSubmitted() ? "Auto Submitted" : "Completed");
                res.put("marks", sub.getScore());
                res.put("totalMarks", sub.getTotalMarks() > 0 ? sub.getTotalMarks() : exam.getTotalMarks());
                res.put("scorePercentage", sub.getTotalMarks() > 0 ? Math.round(((float) sub.getScore() / sub.getTotalMarks()) * 100) : 0);
                res.put("riskScore", sub.getFinalRiskScore());
                res.put("riskLevel", sub.getFinalRiskLevel());
                res.put("cheatingFlag", sub.isCheatingFlag() || sub.getFinalRiskScore() >= 80);
                res.put("autoSubmitted", sub.isAutoSubmitted());
                res.put("submissionId", sub.getId());
                res.put("submittedAt", sub.getSubmittedAt());

                if (sub.isAutoSubmitted()) autoSubmittedCount++;
                else completedCount++;
                sumScores += sub.getScore();
                if (sub.getFinalRiskScore() >= 80 || sub.isCheatingFlag()) highRiskCount++;
            } else {
                // Check if candidate currently has active attempt
                Optional<Candidate> candOpt = candidateRepository.findById(asgn.getStudentId());
                if (candOpt.isPresent() && "active".equalsIgnoreCase(candOpt.get().getStatus())) {
                    Candidate c = candOpt.get();
                    res.put("status", "In Progress");
                    res.put("marks", 0);
                    res.put("totalMarks", exam.getTotalMarks());
                    res.put("scorePercentage", 0);
                    res.put("riskScore", c.getRiskScore());
                    res.put("riskLevel", c.getRisk());
                    res.put("cheatingFlag", c.isCheatingFlag());
                    res.put("autoSubmitted", false);
                    inProgressCount++;
                } else {
                    res.put("status", "Not Attempted");
                    res.put("marks", "-");
                    res.put("totalMarks", exam.getTotalMarks());
                    res.put("scorePercentage", 0);
                    res.put("riskScore", 0);
                    res.put("riskLevel", "LOW");
                    res.put("cheatingFlag", false);
                    res.put("autoSubmitted", false);
                    unattemptedCount++;
                }
            }

            studentResults.add(res);
        }

        // Add any additional student submissions that took this exam
        for (ExamSubmission sub : submissions) {
            if (!processedStudentIds.contains(sub.getStudentId())) {
                processedStudentIds.add(sub.getStudentId());
                Map<String, Object> res = new HashMap<>();
                res.put("studentId", sub.getStudentId());
                res.put("studentName", sub.getStudentName());
                res.put("studentEmail", sub.getStudentId().toLowerCase() + "@university.edu");
                res.put("status", sub.isAutoSubmitted() ? "Auto Submitted" : "Completed");
                res.put("marks", sub.getScore());
                res.put("totalMarks", sub.getTotalMarks() > 0 ? sub.getTotalMarks() : exam.getTotalMarks());
                res.put("scorePercentage", sub.getTotalMarks() > 0 ? Math.round(((float) sub.getScore() / sub.getTotalMarks()) * 100) : 0);
                res.put("riskScore", sub.getFinalRiskScore());
                res.put("riskLevel", sub.getFinalRiskLevel());
                res.put("cheatingFlag", sub.isCheatingFlag() || sub.getFinalRiskScore() >= 80);
                res.put("autoSubmitted", sub.isAutoSubmitted());
                res.put("submissionId", sub.getId());
                res.put("submittedAt", sub.getSubmittedAt());

                if (sub.isAutoSubmitted()) autoSubmittedCount++;
                else completedCount++;
                sumScores += sub.getScore();
                if (sub.getFinalRiskScore() >= 80 || sub.isCheatingFlag()) highRiskCount++;

                studentResults.add(res);
            }
        }

        int totalEvaluated = completedCount + autoSubmittedCount;
        double averageScore = totalEvaluated > 0 ? Math.round(((double) sumScores / totalEvaluated) * 10.0) / 10.0 : 0.0;

        Map<String, Object> response = new HashMap<>();
        response.put("exam", enrichExamMetadata(exam));
        response.put("assignedCount", assignments.size() > 0 ? assignments.size() : studentResults.size());
        response.put("attemptedCount", totalEvaluated + inProgressCount);
        response.put("completedCount", completedCount);
        response.put("autoSubmittedCount", autoSubmittedCount);
        response.put("inProgressCount", inProgressCount);
        response.put("unattemptedCount", unattemptedCount);
        response.put("averageScore", averageScore);
        response.put("highRiskCount", highRiskCount);
        response.put("results", studentResults);

        return ResponseEntity.ok(response);
    }

    /**
     * Admin detailed student proctoring & submission drill-down report.
     */
    @GetMapping("/{id}/results/{studentId}")
    public ResponseEntity<?> getStudentResultDetail(@PathVariable String id, @PathVariable String studentId) {
        Optional<ExamSubmission> subOpt = submissionRepository.findFirstByExamIdAndStudentIdOrderBySubmittedAtDesc(id, studentId);
        Optional<Exam> examOpt = examRepository.findById(id);

        Map<String, Object> report = new HashMap<>();
        report.put("examId", id);
        report.put("examTitle", examOpt.map(Exam::getName).orElse("Exam " + id));
        report.put("studentId", studentId);

        if (subOpt.isPresent()) {
            ExamSubmission sub = subOpt.get();
            report.put("submission", sub);
            report.put("status", sub.getStatus());
            report.put("marks", sub.getScore());
            report.put("totalMarks", sub.getTotalMarks());
            report.put("mcqScore", sub.getMcqScore());
            report.put("codingScore", sub.getCodingScore());
            report.put("finalRiskScore", sub.getFinalRiskScore());
            report.put("finalRiskLevel", sub.getFinalRiskLevel());
            report.put("cheatingFlag", sub.isCheatingFlag());
            report.put("autoSubmitted", sub.isAutoSubmitted());
            report.put("submissionReason", sub.getSubmissionReason());
            report.put("submittedAt", sub.getSubmittedAt());

            try {
                if (sub.getAnswersJson() != null) {
                    report.put("answers", JsonUtil.fromJson(sub.getAnswersJson(), Object.class));
                }
                if (sub.getCodingResultsJson() != null) {
                    report.put("codingResults", JsonUtil.fromJson(sub.getCodingResultsJson(), Object.class));
                }
                if (sub.getProctoringSummaryJson() != null) {
                    report.put("proctoringSummary", JsonUtil.fromJson(sub.getProctoringSummaryJson(), Object.class));
                }
            } catch (Exception ignored) {}
        } else {
            report.put("status", "Not Attempted");
        }

        return ResponseEntity.ok(report);
    }

    /**
     * Helper to add calculated availability status and formatted duration to exam entity.
     */
    private Map<String, Object> enrichExamMetadata(Exam exam) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", exam.getId());
        map.put("code", exam.getCode());
        map.put("name", exam.getName());
        map.put("description", exam.getDescription());
        map.put("date", exam.getDate());
        map.put("time", exam.getTime());
        map.put("startTime", exam.getStartTime() != null ? exam.getStartTime() : exam.getTime());
        map.put("endTime", exam.getEndTime() != null ? exam.getEndTime() : "02:00 PM");
        map.put("windowStartDate", exam.getWindowStartDate() != null ? exam.getWindowStartDate() : exam.getDate());
        map.put("windowEndDate", exam.getWindowEndDate() != null ? exam.getWindowEndDate() : exam.getDate());
        map.put("duration", exam.getDuration());
        map.put("durationMinutes", exam.getDurationMinutes() > 0 ? exam.getDurationMinutes() : 60);
        map.put("studentsCount", exam.getStudentsCount());
        map.put("status", exam.getStatus());
        map.put("proctoringMode", exam.getProctoringMode());
        map.put("type", exam.getType() != null ? exam.getType() : "mcq");
        map.put("totalQuestions", exam.getTotalQuestions());
        map.put("totalMarks", exam.getTotalMarks());
        map.put("instructions", exam.getInstructions());
        map.put("passingMarks", exam.getPassingMarks());
        map.put("createdAt", exam.getCreatedAt());

        ExamAvailabilityService.WindowStatus ws = examAvailabilityService.getWindowStatus(exam);
        map.put("windowStatus", ws.name());
        map.put("canStart", ws == ExamAvailabilityService.WindowStatus.OPEN);

        return map;
    }

    @PostMapping("/{id}/events")
    public ResponseEntity<?> recordSecurityEvent(@PathVariable String id, @RequestBody Map<String, Object> payload) {
        String studentId = payload.containsKey("studentId") ? (String) payload.get("studentId")
                : (String) payload.getOrDefault("candidateId", "STU001");
        String studentName = payload.containsKey("studentName") ? (String) payload.get("studentName")
                : (String) payload.getOrDefault("candidateName", "Alex Morgan");
        String type = payload.containsKey("type") ? (String) payload.get("type")
                : (String) payload.getOrDefault("eventType", "SECURITY_WARNING");
        String severity = (String) payload.getOrDefault("severity", "medium");
        String message = payload.containsKey("message") ? (String) payload.get("message")
                : (String) payload.getOrDefault("details", "Security event recorded");
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

        return ResponseEntity.ok(savedEvent);
    }
}
