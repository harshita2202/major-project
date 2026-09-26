package com.proctoring.proctoring_backend.dto;

import java.time.LocalDateTime;

public class CandidateRiskSummary {

    private String sessionId;
    private String candidateId;
    private String candidateName;
    private String avatar;
    private String examId;
    private int riskScore;
    private String riskLevel; // "HIGH", "MEDIUM", "LOW"
    private String status; // "ACTIVE", "AUTO_SUBMITTED", "COMPLETED"
    private String submissionReason;
    private boolean cheatingFlag;
    private String latestEvent;
    private int violationCount;
    private LocalDateTime lastActiveTime;

    public CandidateRiskSummary() {}

    public CandidateRiskSummary(String sessionId, String candidateId, String candidateName,
                                String avatar, String examId, int riskScore, String riskLevel,
                                String status, String submissionReason, boolean cheatingFlag,
                                String latestEvent, int violationCount,
                                LocalDateTime lastActiveTime) {
        this.sessionId = sessionId;
        this.candidateId = candidateId;
        this.candidateName = candidateName;
        this.avatar = avatar;
        this.examId = examId;
        this.riskScore = riskScore;
        this.riskLevel = riskLevel;
        this.status = status;
        this.submissionReason = submissionReason;
        this.cheatingFlag = cheatingFlag;
        this.latestEvent = latestEvent;
        this.violationCount = violationCount;
        this.lastActiveTime = lastActiveTime;
    }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getCandidateId() { return candidateId; }
    public void setCandidateId(String candidateId) { this.candidateId = candidateId; }

    public String getCandidateName() { return candidateName; }
    public void setCandidateName(String candidateName) { this.candidateName = candidateName; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }

    public int getRiskScore() { return riskScore; }
    public void setRiskScore(int riskScore) { this.riskScore = riskScore; }

    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String riskLevel) { this.riskLevel = riskLevel; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getSubmissionReason() { return submissionReason; }
    public void setSubmissionReason(String submissionReason) { this.submissionReason = submissionReason; }

    public boolean isCheatingFlag() { return cheatingFlag; }
    public void setCheatingFlag(boolean cheatingFlag) { this.cheatingFlag = cheatingFlag; }

    public String getLatestEvent() { return latestEvent; }
    public void setLatestEvent(String latestEvent) { this.latestEvent = latestEvent; }

    public int getViolationCount() { return violationCount; }
    public void setViolationCount(int violationCount) { this.violationCount = violationCount; }

    public LocalDateTime getLastActiveTime() { return lastActiveTime; }
    public void setLastActiveTime(LocalDateTime lastActiveTime) { this.lastActiveTime = lastActiveTime; }
}
