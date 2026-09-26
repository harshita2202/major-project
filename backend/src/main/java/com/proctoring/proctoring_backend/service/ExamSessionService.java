package com.proctoring.proctoring_backend.service;

import com.proctoring.proctoring_backend.dto.CandidateRiskSummary;
import com.proctoring.proctoring_backend.dto.ExaminerLiveRiskResponse;
import com.proctoring.proctoring_backend.dto.SessionResponse;
import com.proctoring.proctoring_backend.dto.StartSessionRequest;
import com.proctoring.proctoring_backend.entity.Candidate;
import com.proctoring.proctoring_backend.entity.Exam;
import com.proctoring.proctoring_backend.entity.ExamSession;
import com.proctoring.proctoring_backend.entity.ProctoringEvent;
import com.proctoring.proctoring_backend.repository.CandidateRepository;
import com.proctoring.proctoring_backend.repository.ExamRepository;
import com.proctoring.proctoring_backend.repository.ExamSessionRepository;
import com.proctoring.proctoring_backend.repository.ProctoringEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ExamSessionService {

    private final ExamSessionRepository examSessionRepository;
    private final ExamRepository examRepository;
    private final CandidateRepository candidateRepository;
    private final ProctoringEventRepository proctoringEventRepository;

    public ExamSessionService(ExamSessionRepository examSessionRepository,
                              ExamRepository examRepository,
                              CandidateRepository candidateRepository,
                              ProctoringEventRepository proctoringEventRepository) {
        this.examSessionRepository = examSessionRepository;
        this.examRepository = examRepository;
        this.candidateRepository = candidateRepository;
        this.proctoringEventRepository = proctoringEventRepository;
    }

    @Transactional
    public SessionResponse startSession(StartSessionRequest request) {
        String examId = request.getExamId();
        String candidateId = request.getCandidateId();

        // 1. Check if candidate already has an ACTIVE session for this exam
        Optional<ExamSession> activeSessionOpt = examSessionRepository
                .findByCandidateIdAndExamIdAndStatus(candidateId, examId, "ACTIVE");

        if (activeSessionOpt.isPresent()) {
            ExamSession existing = activeSessionOpt.get();
            existing.setLastActiveTime(LocalDateTime.now());
            if (request.getTimeRemainingSeconds() != null) {
                existing.setTimeRemainingSeconds(request.getTimeRemainingSeconds());
            }
            examSessionRepository.save(existing);
            return SessionResponse.fromEntity(existing);
        }

        // 2. Resolve Candidate Name
        String candidateName = request.getCandidateName();
        if (candidateName == null || candidateName.trim().isEmpty()) {
            candidateName = candidateRepository.findById(candidateId)
                    .map(Candidate::getCandidate)
                    .orElse("Candidate " + candidateId);
        }

        // 3. Resolve Duration
        Integer timeRemaining = request.getTimeRemainingSeconds();
        if (timeRemaining == null || timeRemaining <= 0) {
            timeRemaining = calculateExamDurationSeconds(examId);
        }

        // 4. Create new ExamSession
        String sessionId = "session-" + UUID.randomUUID().toString().substring(0, 8);
        ExamSession session = new ExamSession(sessionId, examId, candidateId, candidateName, timeRemaining);
        examSessionRepository.save(session);

        return SessionResponse.fromEntity(session);
    }

    public Optional<SessionResponse> getSessionById(String sessionId) {
        return examSessionRepository.findById(sessionId)
                .map(SessionResponse::fromEntity);
    }

    public Optional<SessionResponse> getActiveSession(String candidateId, String examId) {
        return examSessionRepository.findByCandidateIdAndExamIdAndStatus(candidateId, examId, "ACTIVE")
                .map(SessionResponse::fromEntity);
    }

    public List<SessionResponse> getSessionsByCandidate(String candidateId) {
        return examSessionRepository.findByCandidateId(candidateId)
                .stream()
                .map(SessionResponse::fromEntity)
                .toList();
    }

    public List<SessionResponse> getSessionsByExam(String examId) {
        return examSessionRepository.findByExamId(examId)
                .stream()
                .map(SessionResponse::fromEntity)
                .toList();
    }

    @Transactional
    public Optional<SessionResponse> completeSession(String sessionId) {
        return examSessionRepository.findById(sessionId).map(session -> {
            session.setStatus("COMPLETED");
            session.setEndTime(LocalDateTime.now());
            session.setLastActiveTime(LocalDateTime.now());
            session.setTimeRemainingSeconds(0);
            examSessionRepository.save(session);
            return SessionResponse.fromEntity(session);
        });
    }

    @Transactional
    public Optional<SessionResponse> updateProgress(String sessionId, Integer questionIndex, Integer timeRemainingSeconds) {
        return examSessionRepository.findById(sessionId).map(session -> {
            if (questionIndex != null) {
                session.setCurrentQuestionIndex(questionIndex);
            }
            if (timeRemainingSeconds != null) {
                session.setTimeRemainingSeconds(timeRemainingSeconds);
            }
            session.setLastActiveTime(LocalDateTime.now());
            examSessionRepository.save(session);
            return SessionResponse.fromEntity(session);
        });
    }

    public ExaminerLiveRiskResponse getLiveRiskDashboard(String examId) {
        List<String> activeStatuses = List.of("ACTIVE", "AUTO_SUBMITTED", "in-progress", "active");
        List<ExamSession> sessions;
        if (examId != null && !examId.trim().isEmpty()) {
            sessions = examSessionRepository.findByExamIdAndStatusIn(examId, activeStatuses);
        } else {
            sessions = examSessionRepository.findByStatusIn(activeStatuses);
        }

        List<CandidateRiskSummary> highRisk = new ArrayList<>();
        List<CandidateRiskSummary> mediumRisk = new ArrayList<>();
        List<CandidateRiskSummary> lowRisk = new ArrayList<>();
        int activeCount = 0;
        int autoSubmittedCount = 0;

        for (ExamSession session : sessions) {
            String avatar = candidateRepository.findById(session.getCandidateId())
                    .map(Candidate::getAvatar)
                    .orElse("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces");

            String latestEventType = proctoringEventRepository
                    .findFirstBySessionIdOrderByTimestampDesc(session.getId())
                    .map(ProctoringEvent::getEventType)
                    .orElse("NONE");

            boolean isCheating = session.isCheatingFlag() || session.getRiskScore() >= 80 || "AUTO_SUBMITTED".equalsIgnoreCase(session.getStatus());

            CandidateRiskSummary summary = new CandidateRiskSummary(
                    session.getId(),
                    session.getCandidateId(),
                    session.getCandidateName(),
                    avatar,
                    session.getExamId(),
                    session.getRiskScore(),
                    session.getRiskLevel(),
                    session.getStatus(),
                    session.getSubmissionReason(),
                    isCheating,
                    latestEventType,
                    session.getViolationCount(),
                    session.getLastActiveTime()
            );

            if ("AUTO_SUBMITTED".equalsIgnoreCase(session.getStatus())) {
                autoSubmittedCount++;
            } else if ("ACTIVE".equalsIgnoreCase(session.getStatus())) {
                activeCount++;
            }

            int score = session.getRiskScore();
            if (score >= 80) {
                highRisk.add(summary);
            } else if (score >= 50) {
                mediumRisk.add(summary);
            } else {
                lowRisk.add(summary);
            }
        }

        // Sort descending by highest risk score first within each section
        highRisk.sort(Comparator.comparingInt(CandidateRiskSummary::getRiskScore).reversed());
        mediumRisk.sort(Comparator.comparingInt(CandidateRiskSummary::getRiskScore).reversed());
        lowRisk.sort(Comparator.comparingInt(CandidateRiskSummary::getRiskScore).reversed());

        ExaminerLiveRiskResponse response = new ExaminerLiveRiskResponse(highRisk, mediumRisk, lowRisk);
        response.setActiveCount(activeCount);
        response.setAutoSubmittedCount(autoSubmittedCount);
        return response;
    }

    private int calculateExamDurationSeconds(String examId) {
        Optional<Exam> examOpt = examRepository.findById(examId);
        if (examOpt.isPresent()) {
            String durationStr = examOpt.get().getDuration();
            if (durationStr != null) {
                Matcher matcher = Pattern.compile("(\\d+)").matcher(durationStr);
                if (matcher.find()) {
                    int minutes = Integer.parseInt(matcher.group(1));
                    return minutes * 60;
                }
            }
        }
        return 3600; // default 60 minutes (3600s)
    }
}
