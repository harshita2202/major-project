package com.proctoring.proctoring_backend.dto;

import com.proctoring.proctoring_backend.entity.ProctoringEvent;
import java.time.LocalDateTime;

public class ProctoringEventResponse {

    private String id;
    private String sessionId;
    private String examId;
    private String candidateId;
    private String eventType;
    private String severity;
    private String details;
    private String metadata;
    private LocalDateTime timestamp;

    // Risk Scoring & Warning fields
    private int pointsAdded;
    private int updatedRiskScore;
    private String updatedRiskLevel;
    private String warningMessage;

    // Medium-Risk (50+) threshold alert
    private boolean mediumWarningTriggered;
    private String mediumWarningMessage;

    // High-Risk (80+) Auto-submission alert
    private boolean autoSubmitted;
    private String autoSubmitMessage;
    private String sessionStatus;
    private String submissionReason;

    public ProctoringEventResponse() {}

    public static ProctoringEventResponse fromEntity(ProctoringEvent event) {
        if (event == null) return null;
        ProctoringEventResponse resp = new ProctoringEventResponse();
        resp.setId(event.getId());
        resp.setSessionId(event.getSessionId());
        resp.setExamId(event.getExamId());
        resp.setCandidateId(event.getCandidateId());
        resp.setEventType(event.getEventType());
        resp.setSeverity(event.getSeverity());
        resp.setDetails(event.getDetails());
        resp.setMetadata(event.getMetadata());
        resp.setTimestamp(event.getTimestamp());
        resp.setPointsAdded(event.getPointsAdded());
        resp.setUpdatedRiskScore(event.getUpdatedRiskScore());
        resp.setUpdatedRiskLevel(event.getUpdatedRiskLevel());
        resp.setWarningMessage(event.getWarningMessage());
        return resp;
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

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public int getPointsAdded() { return pointsAdded; }
    public void setPointsAdded(int pointsAdded) { this.pointsAdded = pointsAdded; }

    public int getUpdatedRiskScore() { return updatedRiskScore; }
    public void setUpdatedRiskScore(int updatedRiskScore) { this.updatedRiskScore = updatedRiskScore; }

    public String getUpdatedRiskLevel() { return updatedRiskLevel; }
    public void setUpdatedRiskLevel(String updatedRiskLevel) { this.updatedRiskLevel = updatedRiskLevel; }

    public String getWarningMessage() { return warningMessage; }
    public void setWarningMessage(String warningMessage) { this.warningMessage = warningMessage; }

    public boolean isMediumWarningTriggered() { return mediumWarningTriggered; }
    public void setMediumWarningTriggered(boolean mediumWarningTriggered) { this.mediumWarningTriggered = mediumWarningTriggered; }

    public String getMediumWarningMessage() { return mediumWarningMessage; }
    public void setMediumWarningMessage(String mediumWarningMessage) { this.mediumWarningMessage = mediumWarningMessage; }

    public boolean isAutoSubmitted() { return autoSubmitted; }
    public void setAutoSubmitted(boolean autoSubmitted) { this.autoSubmitted = autoSubmitted; }

    public String getAutoSubmitMessage() { return autoSubmitMessage; }
    public void setAutoSubmitMessage(String autoSubmitMessage) { this.autoSubmitMessage = autoSubmitMessage; }

    public String getSessionStatus() { return sessionStatus; }
    public void setSessionStatus(String sessionStatus) { this.sessionStatus = sessionStatus; }

    public String getSubmissionReason() { return submissionReason; }
    public void setSubmissionReason(String submissionReason) { this.submissionReason = submissionReason; }
}
