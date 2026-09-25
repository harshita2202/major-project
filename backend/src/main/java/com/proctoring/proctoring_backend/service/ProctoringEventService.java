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
    private final SimpMessagingTemplate messagingTemplate;

    public ProctoringEventService(ProctoringEventRepository proctoringEventRepository,
                                  ExamSessionRepository examSessionRepository,
                                  ViolationRepository violationRepository,
                                  SecurityEventRepository securityEventRepository,
                                  ExamRepository examRepository,
                                  CandidateRepository candidateRepository,
                                  SimpMessagingTemplate messagingTemplate) {
        this.proctoringEventRepository = proctoringEventRepository;
        this.examSessionRepository = examSessionRepository;
        this.violationRepository = violationRepository;
        this.securityEventRepository = securityEventRepository;
        this.examRepository = examRepository;
        this.candidateRepository = candidateRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public ProctoringEventResponse recordEvent(ProctoringEventRequest request) {
        String sessionId = request.getSessionId();
        String eventType = request.getEventType();

        // 1. Determine severity based on event type if not provided
        String severity = request.getSeverity();
        if (severity == null || severity.trim().isEmpty()) {
            severity = determineSeverity(eventType);
        } else {
            severity = severity.toLowerCase();
        }

        // 2. Fetch session details if present
        Optional<ExamSession> sessionOpt = (sessionId != null) ? examSessionRepository.findById(sessionId) : Optional.empty();

        String examId = request.getExamId();
        String candidateId = request.getCandidateId();
        String candidateName = request.getCandidateName();

        if (sessionOpt.isPresent()) {
            ExamSession session = sessionOpt.get();
            if (examId == null) examId = session.getExamId();
            if (candidateId == null) candidateId = session.getCandidateId();
            if (candidateName == null) candidateName = session.getCandidateName();

            // Increment session violation count and recalculate risk score
            session.incrementViolationCount();
            examSessionRepository.save(session);
        }

        // 3. Fallbacks
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

        LocalDateTime eventTime = request.getTimestamp() != null ? request.getTimestamp() : LocalDateTime.now();

        // 4. Create and persist ProctoringEvent
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
                eventTime
        );
        proctoringEventRepository.save(event);

        // 5. Update Candidate monitor record if exists
        updateCandidateMonitor(candidateId, eventType, severity);

        // 6. Record in Violation and SecurityEvent tables for existing dashboard compatibility
        recordLegacyViolationAndSecurityEvent(event, candidateName, details);

        // 7. Real-time broadcasting via WebSocket STOMP broker
        ProctoringEventResponse response = ProctoringEventResponse.fromEntity(event);
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

    private String determineSeverity(String eventType) {
        if (eventType == null) return "medium";
        return switch (eventType.toUpperCase()) {
            case "FULLSCREEN_EXIT", "TAB_SWITCH", "MULTIPLE_FACES", "VOICE_DETECTED" -> "high";
            case "CLIPBOARD_PASTE_ATTEMPT", "COPY_ATTEMPT", "SHORTCUT_ATTEMPT" -> "medium";
            case "FULLSCREEN_ENTER", "EXAM_STARTED", "EXAM_SUBMITTED" -> "low";
            default -> "medium";
        };
    }

    private String formatDefaultDetails(String eventType) {
        if (eventType == null) return "Proctoring event logged";
        return switch (eventType.toUpperCase()) {
            case "CLIPBOARD_PASTE_ATTEMPT" -> "Candidate attempted to paste content from clipboard";
            case "TAB_SWITCH" -> "Candidate switched browser tab or focus moved away from exam window";
            case "FULLSCREEN_EXIT" -> "Candidate exited required fullscreen mode";
            case "COPY_ATTEMPT" -> "Candidate attempted to copy examination content";
            case "SHORTCUT_ATTEMPT" -> "Restricted keyboard shortcut combination was detected";
            default -> "Security event: " + eventType;
        };
    }

    private void updateCandidateMonitor(String candidateId, String eventType, String severity) {
        candidateRepository.findById(candidateId).ifPresent(candidate -> {
            int newScore = Math.min(100, candidate.getRiskScore() + ("high".equalsIgnoreCase(severity) ? 20 : 10));
            candidate.setRiskScore(newScore);
            if (newScore >= 60) {
                candidate.setRisk("high");
            } else if (newScore >= 30) {
                candidate.setRisk("medium");
            } else {
                candidate.setRisk("low");
            }
            candidateRepository.save(candidate);
        });
    }

    private void recordLegacyViolationAndSecurityEvent(ProctoringEvent event, String candidateName, String details) {
        try {
            // Record Violation
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

            // Record SecurityEventEntity
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
            // Keep proctoring flow robust
            System.err.println("Warning: Could not create legacy violation record: " + ex.getMessage());
        }
    }

    private void broadcastEvent(ProctoringEventResponse response) {
        try {
            // Broadcast to global topic for invigilator live dashboard
            messagingTemplate.convertAndSend("/topic/events", response);

            // Broadcast to specific session topic
            if (response.getSessionId() != null) {
                messagingTemplate.convertAndSend("/topic/sessions/" + response.getSessionId(), response);
            }

            // Broadcast to exam topic
            if (response.getExamId() != null) {
                messagingTemplate.convertAndSend("/topic/exams/" + response.getExamId(), response);
            }
        } catch (Exception ex) {
            System.err.println("WebSocket broadcast info: " + ex.getMessage());
        }
    }
}
