package com.proctoring.proctoring_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "proctoring_events")
public class ProctoringEvent {

    @Id
    private String id;

    @Column(name = "session_id", nullable = false)
    private String sessionId;

    @Column(name = "exam_id")
    private String examId;

    @Column(name = "candidate_id")
    private String candidateId;

    @Column(name = "event_type", nullable = false)
    private String eventType; // CLIPBOARD_PASTE_ATTEMPT, TAB_SWITCH, FULLSCREEN_EXIT, etc.

    @Column(nullable = false)
    private String severity; // "low", "medium", "high", "critical"

    @Column(length = 2000)
    private String details;

    @Column(columnDefinition = "TEXT")
    private String metadata; // JSON or additional context (e.g. key combo, window info)

    @Column(name = "points_added")
    private Integer pointsAdded = 0;

    @Column(name = "updated_risk_score")
    private Integer updatedRiskScore = 0;

    @Column(name = "updated_risk_level")
    private String updatedRiskLevel;

    @Column(name = "warning_message", length = 1000)
    private String warningMessage;

    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    public ProctoringEvent() {}

    public ProctoringEvent(String id, String sessionId, String examId, String candidateId,
                           String eventType, String severity, String details, String metadata,
                           int pointsAdded, int updatedRiskScore, String updatedRiskLevel,
                           String warningMessage, LocalDateTime timestamp) {
        this.id = id;
        this.sessionId = sessionId;
        this.examId = examId;
        this.candidateId = candidateId;
        this.eventType = eventType;
        this.severity = severity != null ? severity : "medium";
        this.details = details;
        this.metadata = metadata;
        this.pointsAdded = pointsAdded;
        this.updatedRiskScore = updatedRiskScore;
        this.updatedRiskLevel = updatedRiskLevel;
        this.warningMessage = warningMessage;
        this.timestamp = timestamp != null ? timestamp : LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }

    public String getCandidateId() { return candidateId; }
    public void setCandidateId(String candidateId) { this.candidateId = candidateId; }

    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getSeverity() { return severity; }
    public void setSeverity(String severity) { this.severity = severity; }

    public String getDetails() { return details; }
    public void setDetails(String details) { this.details = details; }

    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }

    public int getPointsAdded() { return pointsAdded != null ? pointsAdded : 0; }
    public void setPointsAdded(Integer pointsAdded) { this.pointsAdded = pointsAdded != null ? pointsAdded : 0; }

    public int getUpdatedRiskScore() { return updatedRiskScore != null ? updatedRiskScore : 0; }
    public void setUpdatedRiskScore(Integer updatedRiskScore) { this.updatedRiskScore = updatedRiskScore != null ? updatedRiskScore : 0; }

    public String getUpdatedRiskLevel() { return updatedRiskLevel; }
    public void setUpdatedRiskLevel(String updatedRiskLevel) { this.updatedRiskLevel = updatedRiskLevel; }

    public String getWarningMessage() { return warningMessage; }
    public void setWarningMessage(String warningMessage) { this.warningMessage = warningMessage; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}
