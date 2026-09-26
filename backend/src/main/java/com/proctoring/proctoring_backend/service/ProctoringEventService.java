package com.proctoring.proctoring_backend.service;

import com.proctoring.proctoring_backend.dto.ProctoringEventRequest;
import com.proctoring.proctoring_backend.dto.ProctoringEventResponse;
import com.proctoring.proctoring_backend.entity.*;
import com.proctoring.proctoring_backend.repository.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProctoringEventService {

    private final ProctoringEventRepository proctoringEventRepository;
    private final ExamSessionRepository examSessionRepository;
    private final ViolationRepository violationRepository;
    private final SecurityEventRepository securityEventRepository;
    private final ExamRepository examRepository;
    private final CandidateRepository candidateRepository;
    private final ExamSubmissionRepository examSubmissionRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final RiskScoringService riskScoringService;

    public ProctoringEventService(ProctoringEventRepository proctoringEventRepository,
                                  ExamSessionRepository examSessionRepository,
                                  ViolationRepository violationRepository,
                                  SecurityEventRepository securityEventRepository,
                                  ExamRepository examRepository,
                                  CandidateRepository candidateRepository,
                                  ExamSubmissionRepository examSubmissionRepository,
                                  SimpMessagingTemplate messagingTemplate,
                                  RiskScoringService riskScoringService) {
        this.proctoringEventRepository = proctoringEventRepository;
        this.examSessionRepository = examSessionRepository;
        this.violationRepository = violationRepository;
        this.securityEventRepository = securityEventRepository;
        this.examRepository = examRepository;
        this.candidateRepository = candidateRepository;
        this.examSubmissionRepository = examSubmissionRepository;
        this.messagingTemplate = messagingTemplate;
        this.riskScoringService = riskScoringService;
    }

    @Transactional
    public ProctoringEventResponse recordEvent(ProctoringEventRequest request) {
        String sessionId = request.getSessionId();
        String eventType = request.getEventType();

        // 1. Calculate rule-based risk points & feature warning
        int pointsAdded = riskScoringService.getEventPoints(eventType);
        String featureWarning = riskScoringService.getFeatureWarning(eventType);

        // 2. Fetch session details
        Optional<ExamSession> sessionOpt = (sessionId != null && !sessionId.trim().isEmpty())
                ? examSessionRepository.findById(sessionId)
                : Optional.empty();

        if (sessionOpt.isEmpty() && request.getCandidateId() != null && request.getExamId() != null) {
            sessionOpt = examSessionRepository.findByCandidateIdAndExamIdAndStatus(
                    request.getCandidateId(), request.getExamId(), "ACTIVE"
            );
        }

        String examId = request.getExamId();
        String candidateId = request.getCandidateId();
        String candidateName = request.getCandidateName();

        int updatedRiskScore = pointsAdded;
        String updatedRiskLevel = riskScoringService.calculateRiskLevel(updatedRiskScore);
        boolean mediumWarningTriggered = false;
        String mediumWarningMessage = null;
        boolean autoSubmitted = false;
        String autoSubmitMessage = null;
        String sessionStatus = "ACTIVE";
        String submissionReason = null;
        boolean cheatingFlag = false;

        if (sessionOpt.isPresent()) {
            ExamSession session = sessionOpt.get();
            sessionId = session.getId();
            if (examId == null) examId = session.getExamId();
            if (candidateId == null) candidateId = session.getCandidateId();
            if (candidateName == null) candidateName = session.getCandidateName();

            // Cumulative risk calculation
            int currentScore = session.getRiskScore();
            updatedRiskScore = currentScore + pointsAdded;
            updatedRiskLevel = riskScoringService.calculateRiskLevel(updatedRiskScore);

            session.addRiskPoints(pointsAdded, updatedRiskLevel);

            // Medium-risk warning (50+ points) - Triggered when entering medium tier
            if (updatedRiskScore >= RiskScoringService.MEDIUM_RISK_THRESHOLD && !session.isMediumWarningTriggered()) {
                mediumWarningTriggered = true;
                session.setMediumWarningTriggered(true);
                mediumWarningMessage = RiskScoringService.MEDIUM_RISK_WARNING;
            }

            // High-risk auto-submit (80+ points)
            if (updatedRiskScore >= RiskScoringService.HIGH_RISK_THRESHOLD) {
                autoSubmitted = true;
                cheatingFlag = true;
                session.autoSubmit(RiskScoringService.REASON_THRESHOLD_REACHED);
                session.setCheatingFlag(true);
                session.setRiskLevel("HIGH");
                autoSubmitMessage = RiskScoringService.AUTO_SUBMIT_MESSAGE;
                createAutoSubmissionRecord(session);
            }

            sessionStatus = session.getStatus();
            submissionReason = session.getSubmissionReason();
            cheatingFlag = session.isCheatingFlag();
            examSessionRepository.save(session);
        } else {
            if (updatedRiskScore >= RiskScoringService.MEDIUM_RISK_THRESHOLD) {
                mediumWarningTriggered = true;
                mediumWarningMessage = RiskScoringService.MEDIUM_RISK_WARNING;
            }
            if (updatedRiskScore >= RiskScoringService.HIGH_RISK_THRESHOLD) {
                autoSubmitted = true;
                cheatingFlag = true;
                autoSubmitMessage = RiskScoringService.AUTO_SUBMIT_MESSAGE;
                sessionStatus = "AUTO_SUBMITTED";
                submissionReason = RiskScoringService.REASON_THRESHOLD_REACHED;
            }
        }

        // 3. Fallbacks for IDs & Names
        if (examId == null) examId = "general-exam";
        if (candidateId == null) candidateId = "STU001";
        if (candidateName == null) {
            candidateName = candidateRepository.findById(candidateId)
                    .map(Candidate::getCandidate)
                    .orElse("Candidate " + candidateId);
        }

        String details = request.getDetails();
        if (details == null || details.trim().isEmpty()) {
            details = formatDefaultDetails(eventType);
        }

        String severity = request.getSeverity();
        if (severity == null || severity.trim().isEmpty()) {
            severity = determineSeverity(eventType, updatedRiskLevel);
        } else {
            severity = severity.toLowerCase();
        }

        LocalDateTime eventTime = request.getTimestamp() != null ? request.getTimestamp() : LocalDateTime.now();

        // 4. Create and persist ProctoringEvent with risk metadata
        String eventId = "evt-" + UUID.randomUUID().toString().substring(0, 8);
        ProctoringEvent event = new ProctoringEvent(
                eventId,
                sessionId != null ? sessionId : "unknown-session",
                examId,
                candidateId,
                eventType,
                severity,
                details,
                request.getMetadata(),
                pointsAdded,
                updatedRiskScore,
                updatedRiskLevel,
                featureWarning,
                eventTime
        );
        proctoringEventRepository.save(event);

        // 5. Update Candidate monitor record if exists
        updateCandidateMonitor(candidateId, updatedRiskScore, updatedRiskLevel, autoSubmitted);

        // 6. Record in Violation and SecurityEvent tables for existing dashboard compatibility
        recordLegacyViolationAndSecurityEvent(event, candidateName, details);

        // 7. Assemble comprehensive ProctoringEventResponse
        ProctoringEventResponse response = ProctoringEventResponse.fromEntity(event);
        response.setCandidateName(candidateName);
        response.setCheatingFlag(cheatingFlag);
        response.setLatestEvent(eventType);
        response.setPointsAdded(pointsAdded);
        response.setUpdatedRiskScore(updatedRiskScore);
        response.setUpdatedRiskLevel(updatedRiskLevel);
        response.setWarningMessage(featureWarning);
        response.setMediumWarningTriggered(mediumWarningTriggered);
        response.setMediumWarningMessage(mediumWarningMessage);
        response.setAutoSubmitted(autoSubmitted);
        response.setAutoSubmitMessage(autoSubmitMessage);
        response.setSessionStatus(sessionStatus);
        response.setSubmissionReason(submissionReason);

        // 8. Real-time broadcasting via WebSocket STOMP broker
        broadcastEvent(response);

        return response;
    }

    public List<ProctoringEventResponse> getEventsBySessionId(String sessionId) {
        return proctoringEventRepository.findBySessionIdOrderByTimestampDesc(sessionId)
                .stream()
                .map(ProctoringEventResponse::fromEntity)
                .toList();
    }

    public List<ProctoringEventResponse> getEventsByExamId(String examId) {
        return proctoringEventRepository.findByExamIdOrderByTimestampDesc(examId)
                .stream()
                .map(ProctoringEventResponse::fromEntity)
                .toList();
    }

    private String determineSeverity(String eventType, String riskLevel) {
        if ("HIGH".equalsIgnoreCase(riskLevel)) return "high";
        if (eventType == null) return "medium";
        return switch (eventType.toUpperCase()) {
            case "TAB_SWITCH", "CLIPBOARD_PASTE_ATTEMPT", "FULLSCREEN_EXIT" -> "high";
            case "GAZE_WARNING", "GAZE", "COPY_ATTEMPT" -> "medium";
            default -> "low";
        };
    }

    private String formatDefaultDetails(String eventType) {
        if (eventType == null) return "Proctoring event logged";
        return switch (eventType.toUpperCase()) {
            case "CLIPBOARD_PASTE_ATTEMPT" -> "Candidate attempted to paste content from clipboard";
            case "TAB_SWITCH" -> "Candidate switched browser tab or focus moved away from exam window";
            case "FULLSCREEN_EXIT" -> "Candidate exited required fullscreen mode";
            case "GAZE_WARNING", "GAZE" -> "Prolonged gaze deviation detected away from exam window";
            case "LONG_INACTIVITY" -> "Candidate inactive for an extended period";
            case "NETWORK_DISCONNECTION" -> "Network connection interrupted";
            default -> "Security event: " + eventType;
        };
    }

    private void updateCandidateMonitor(String candidateId, int updatedScore, String updatedLevel, boolean autoSubmitted) {
        candidateRepository.findById(candidateId).ifPresent(candidate -> {
            candidate.setRiskScore(updatedScore);
            candidate.setRisk(updatedLevel.toLowerCase());
            if (autoSubmitted || updatedScore >= RiskScoringService.HIGH_RISK_THRESHOLD) {
                candidate.setStatus("AUTO_SUBMITTED");
                candidate.setCheatingFlag(true);
            }
            candidateRepository.save(candidate);
        });
    }

    private void createAutoSubmissionRecord(ExamSession session) {
        try {
            String submissionId = "sub-auto-" + UUID.randomUUID().toString().substring(0, 8);
            ExamSubmission submission = new ExamSubmission(
                    submissionId,
                    session.getExamId(),
                    session.getCandidateId(),
                    session.getCandidateName(),
                    "{}",
                    0,
                    0,
                    "AUTO_SUBMITTED"
            );
            examSubmissionRepository.save(submission);
        } catch (Exception ex) {
            System.err.println("Notice: Auto-submission log: " + ex.getMessage());
        }
    }

    private void recordLegacyViolationAndSecurityEvent(ProctoringEvent event, String candidateName, String details) {
        try {
            String violId = "VIO-" + (System.currentTimeMillis() % 100000);
            String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            String examTitle = examRepository.findById(event.getExamId()).map(Exam::getName).orElse(event.getExamId());

            Violation violation = new Violation(
                    violId,
                    event.getCandidateId(),
                    candidateName,
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces",
                    examTitle,
                    event.getEventType(),
                    event.getSeverity(),
                    now,
                    "pending",
                    details
            );
            violationRepository.save(violation);

            SecurityEventEntity secEvent = new SecurityEventEntity(
                    event.getId(),
                    event.getExamId(),
                    event.getCandidateId(),
                    event.getEventType(),
                    event.getSeverity(),
                    details
            );
            securityEventRepository.save(secEvent);
        } catch (Exception ex) {
            System.err.println("Warning: Could not create legacy violation record: " + ex.getMessage());
        }
    }

    private void broadcastEvent(ProctoringEventResponse response) {
        try {
            // 1. Global topic for invigilator live dashboard
            messagingTemplate.convertAndSend("/topic/events", response);

            // 2. Dedicated risk updates channel for real-time risk level shifts
            messagingTemplate.convertAndSend("/topic/examiner/risk-updates", response);

            // 3. Specific session topic (listened to by student and individual proctor)
            if (response.getSessionId() != null) {
                messagingTemplate.convertAndSend("/topic/sessions/" + response.getSessionId(), response);
            }

            // 4. Exam-specific room topic
            if (response.getExamId() != null) {
                messagingTemplate.convertAndSend("/topic/exams/" + response.getExamId(), response);
            }
        } catch (Exception ex) {
            System.err.println("WebSocket broadcast info: " + ex.getMessage());
        }
    }
}
