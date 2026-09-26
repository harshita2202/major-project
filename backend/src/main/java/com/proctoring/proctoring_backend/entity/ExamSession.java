package com.proctoring.proctoring_backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "exam_sessions")
public class ExamSession {

    @Id
    private String id;

    @Column(name = "exam_id", nullable = false)
    private String examId;

    @Column(name = "candidate_id", nullable = false)
    private String candidateId;

    @Column(name = "candidate_name")
    private String candidateName;

    @Column(nullable = false)
    private String status = "ACTIVE"; // "ACTIVE", "COMPLETED", "TERMINATED", "DISQUALIFIED"

    @Column(name = "start_time")
    private LocalDateTime startTime = LocalDateTime.now();

    @Column(name = "end_time")
    private LocalDateTime endTime;

    @Column(name = "last_active_time")
    private LocalDateTime lastActiveTime = LocalDateTime.now();

    @Column(name = "current_question_index")
    private Integer currentQuestionIndex = 0;

    @Column(name = "time_remaining_seconds")
    private Integer timeRemainingSeconds;

    @Column(name = "violation_count")
    private int violationCount = 0;

    @Column(name = "risk_level")
    private String riskLevel = "LOW"; // "LOW", "MEDIUM", "HIGH"

    @Column(name = "risk_score")
    private int riskScore = 0; // Cumulative score

    @Column(name = "medium_warning_triggered")
    private Boolean mediumWarningTriggered = false;

    @Column(name = "cheating_flag")
    private Boolean cheatingFlag = false;

    @Column(name = "submission_reason")
    private String submissionReason;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public ExamSession() {}

    public ExamSession(String id, String examId, String candidateId, String candidateName, Integer timeRemainingSeconds) {
        this.id = id;
        this.examId = examId;
        this.candidateId = candidateId;
        this.candidateName = candidateName;
        this.timeRemainingSeconds = timeRemainingSeconds;
        this.status = "ACTIVE";
        this.startTime = LocalDateTime.now();
        this.lastActiveTime = LocalDateTime.now();
        this.currentQuestionIndex = 0;
        this.violationCount = 0;
        this.riskLevel = "LOW";
        this.riskScore = 0;
        this.mediumWarningTriggered = false;
        this.cheatingFlag = false;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void addRiskPoints(int points, String calculatedLevel) {
        this.violationCount++;
        this.riskScore += points;
        this.riskLevel = calculatedLevel;
        this.updatedAt = LocalDateTime.now();
        this.lastActiveTime = LocalDateTime.now();
    }

    public void autoSubmit(String reason) {
        this.status = "AUTO_SUBMITTED";
        this.riskLevel = "HIGH";
        this.cheatingFlag = true;
        this.submissionReason = reason;
        this.endTime = LocalDateTime.now();
        this.lastActiveTime = LocalDateTime.now();
        this.timeRemainingSeconds = 0;
        this.updatedAt = LocalDateTime.now();
    }

    public void incrementViolationCount() {
        this.violationCount++;
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
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

    public int getTotalRiskScore() { return riskScore; }
    public void setTotalRiskScore(int totalRiskScore) { this.riskScore = totalRiskScore; }

    public boolean isMediumWarningTriggered() { return Boolean.TRUE.equals(mediumWarningTriggered); }
    public void setMediumWarningTriggered(Boolean mediumWarningTriggered) { this.mediumWarningTriggered = mediumWarningTriggered; }

    public Boolean getCheatingFlag() { return cheatingFlag; }
    public boolean isCheatingFlag() { return Boolean.TRUE.equals(cheatingFlag); }
    public void setCheatingFlag(Boolean cheatingFlag) { this.cheatingFlag = cheatingFlag; }

    public String getSubmissionReason() { return submissionReason; }
    public void setSubmissionReason(String submissionReason) { this.submissionReason = submissionReason; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
