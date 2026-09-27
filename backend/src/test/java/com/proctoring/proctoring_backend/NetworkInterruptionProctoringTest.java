package com.proctoring.proctoring_backend;

import com.proctoring.proctoring_backend.dto.ProctoringEventRequest;
import com.proctoring.proctoring_backend.dto.ProctoringEventResponse;
import com.proctoring.proctoring_backend.entity.Candidate;
import com.proctoring.proctoring_backend.entity.ExamSession;
import com.proctoring.proctoring_backend.entity.ProctoringEvent;
import com.proctoring.proctoring_backend.repository.*;
import com.proctoring.proctoring_backend.service.ProctoringEventService;
import com.proctoring.proctoring_backend.service.RiskScoringService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class NetworkInterruptionProctoringTest {

    private RiskScoringService riskScoringService;
    private ProctoringEventRepository proctoringEventRepository;
    private ExamSessionRepository examSessionRepository;
    private ViolationRepository violationRepository;
    private SecurityEventRepository securityEventRepository;
    private ExamRepository examRepository;
    private CandidateRepository candidateRepository;
    private ExamSubmissionRepository examSubmissionRepository;
    private SimpMessagingTemplate messagingTemplate;
    private ProctoringEventService proctoringEventService;

    @BeforeEach
    void setUp() {
        riskScoringService = new RiskScoringService();
        proctoringEventRepository = mock(ProctoringEventRepository.class);
        examSessionRepository = mock(ExamSessionRepository.class);
        violationRepository = mock(ViolationRepository.class);
        securityEventRepository = mock(SecurityEventRepository.class);
        examRepository = mock(ExamRepository.class);
        candidateRepository = mock(CandidateRepository.class);
        examSubmissionRepository = mock(ExamSubmissionRepository.class);
        messagingTemplate = mock(SimpMessagingTemplate.class);

        proctoringEventService = new ProctoringEventService(
                proctoringEventRepository,
                examSessionRepository,
                violationRepository,
                securityEventRepository,
                examRepository,
                candidateRepository,
                examSubmissionRepository,
                messagingTemplate,
                riskScoringService
        );
    }

    @Test
    @DisplayName("Verify NETWORK_INTERRUPTION allocates exactly 5 risk points")
    void testNetworkInterruptionPoints() {
        assertEquals(5, riskScoringService.getEventPoints("NETWORK_INTERRUPTION"));
        assertEquals(5, riskScoringService.getEventPoints("network_interruption"));
        assertEquals(RiskScoringService.WARNING_NETWORK, riskScoringService.getFeatureWarning("NETWORK_INTERRUPTION"));
    }

    @Test
    @DisplayName("Verify NETWORK_INTERRUPTION event records in DB, adds +5 score, and broadcasts via WebSocket")
    void testRecordNetworkInterruptionEvent() {
        String sessionId = "sess-100";
        String examId = "exam-1";
        String candidateId = "STU001";

        ExamSession session = new ExamSession(sessionId, examId, candidateId, "Test Candidate", 3600);
        assertEquals(0, session.getRiskScore());
        assertEquals("LOW", session.getRiskLevel());

        when(examSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        Candidate candidate = new Candidate();
        candidate.setId(candidateId);
        candidate.setCandidate("Test Candidate");
        candidate.setEmail("test@test.com");
        candidate.setRisk("low");
        candidate.setRiskScore(0);
        candidate.setStatus("active");
        when(candidateRepository.findById(candidateId)).thenReturn(Optional.of(candidate));

        ProctoringEventRequest request = new ProctoringEventRequest();
        request.setSessionId(sessionId);
        request.setExamId(examId);
        request.setCandidateId(candidateId);
        request.setCandidateName("Test Candidate");
        request.setEventType("NETWORK_INTERRUPTION");
        request.setSeverity("low");
        request.setDetails("Network connection interrupted for 10 seconds or longer");

        ProctoringEventResponse response = proctoringEventService.recordEvent(request);

        // 1. Verify risk score added +5
        assertEquals(5, response.getPointsAdded());
        assertEquals(5, response.getUpdatedRiskScore());
        assertEquals("LOW", response.getUpdatedRiskLevel());
        assertFalse(response.isAutoSubmitted());

        // 2. Verify saved in PostgreSQL repository
        ArgumentCaptor<ProctoringEvent> eventCaptor = ArgumentCaptor.forClass(ProctoringEvent.class);
        verify(proctoringEventRepository, times(1)).save(eventCaptor.capture());
        ProctoringEvent savedEvent = eventCaptor.getValue();
        assertEquals("NETWORK_INTERRUPTION", savedEvent.getEventType());
        assertEquals(5, savedEvent.getPointsAdded());
        assertEquals(5, savedEvent.getUpdatedRiskScore());

        // 3. Verify WebSocket broadcast to examiner
        verify(messagingTemplate).convertAndSend(eq("/topic/examiner/risk-updates"), any(ProctoringEventResponse.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/events"), any(ProctoringEventResponse.class));
    }

    @Test
    @DisplayName("Verify threshold logic: multiple violations including NETWORK_INTERRUPTION trigger medium/high risk")
    void testThresholdLogicWithNetworkInterruption() {
        String sessionId = "sess-200";
        ExamSession session = new ExamSession(sessionId, "exam-1", "STU002", "Alex Morgan", 3600);
        // Pre-existing score: 45
        session.setRiskScore(45);
        session.setRiskLevel("LOW");

        when(examSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        ProctoringEventRequest request = new ProctoringEventRequest();
        request.setSessionId(sessionId);
        request.setEventType("NETWORK_INTERRUPTION");

        // 45 + 5 = 50 -> enters MEDIUM risk tier!
        ProctoringEventResponse response = proctoringEventService.recordEvent(request);
        assertEquals(50, response.getUpdatedRiskScore());
        assertEquals("MEDIUM", response.getUpdatedRiskLevel());
        assertTrue(response.isMediumWarningTriggered());
        assertFalse(response.isAutoSubmitted());

        // Now pre-existing score 75 + 5 = 80 -> enters HIGH risk tier and auto-submits!
        ExamSession sessionHigh = new ExamSession("sess-300", "exam-1", "STU003", "Sam Taylor", 3600);
        sessionHigh.setRiskScore(75);
        when(examSessionRepository.findById("sess-300")).thenReturn(Optional.of(sessionHigh));

        ProctoringEventRequest requestHigh = new ProctoringEventRequest();
        requestHigh.setSessionId("sess-300");
        requestHigh.setEventType("NETWORK_INTERRUPTION");

        ProctoringEventResponse responseHigh = proctoringEventService.recordEvent(requestHigh);
        assertEquals(80, responseHigh.getUpdatedRiskScore());
        assertEquals("HIGH", responseHigh.getUpdatedRiskLevel());
        assertTrue(responseHigh.isAutoSubmitted());
        assertEquals("CHEATING_RISK_THRESHOLD_REACHED", responseHigh.getSubmissionReason());
    }
}
