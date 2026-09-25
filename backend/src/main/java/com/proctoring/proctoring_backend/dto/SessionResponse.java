package com.proctoring.proctoring_backend.dto;

import com.proctoring.proctoring_backend.entity.ExamSession;
import java.time.LocalDateTime;

public class SessionResponse {

    private String id;
    private String examId;
    private String candidateId;
    private String candidateName;
    private String status;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime lastActiveTime;
    private Integer currentQuestionIndex;
    private Integer timeRemainingSeconds;
    private int violationCount;
    private String riskLevel;
    private int riskScore;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public SessionResponse() {}

    public static SessionResponse fromEntity(ExamSession session) {
        if (session == null) return null;
        SessionResponse resp = new SessionResponse();
        resp.setId(session.getId());
        resp.setExamId(session.getExamId());
        resp.setCandidateId(session.getCandidateId());
        resp.setCandidateName(session.getCandidateName());
        resp.setStatus(session.getStatus());
        resp.setStartTime(session.getStartTime());
        resp.setEndTime(session.getEndTime());
        resp.setLastActiveTime(session.getLastActiveTime());
        resp.setCurrentQuestionIndex(session.getCurrentQuestionIndex());
        resp.setTimeRemainingSeconds(session.getTimeRemainingSeconds());
        resp.setViolationCount(session.getViolationCount());
        resp.setRiskLevel(session.getRiskLevel());
        resp.setRiskScore(session.getRiskScore());
        resp.setCreatedAt(session.getCreatedAt());
        resp.setUpdatedAt(session.getUpdatedAt());
        return resp;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }

    public String getCandidateId() { return candidateId; }
    public void setCandidateId(String candidateId) { this.candidateId = candidateId; }

    public String getCandidateName() { return candidateName; }
    public void setCandidateName(String candidateName) { this.candidateName = candidateName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }

    public LocalDateTime getLastActiveTime() { return lastActiveTime; }
    public void setLastActiveTime(LocalDateTime lastActiveTime) { this.lastActiveTime = lastActiveTime; }

    public Integer getCurrentQuestionIndex() { return currentQuestionIndex; }
    public void setCurrentQuestionIndex(Integer currentQuestionIndex) { this.currentQuestionIndex = currentQuestionIndex; }

    public Integer getTimeRemainingSeconds() { return timeRemainingSeconds; }
    public void setTimeRemainingSeconds(Integer timeRemainingSeconds) { this.timeRemainingSeconds = timeRemainingSeconds; }

    public int getViolationCount() { return violationCount; }
    public void setViolationCount(int violationCount) { this.violationCount = violationCount; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public int getRiskScore() { return riskScore; }
    public void setRiskScore(int riskScore) { this.riskScore = riskScore; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
