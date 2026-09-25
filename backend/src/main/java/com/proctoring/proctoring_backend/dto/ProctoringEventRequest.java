package com.proctoring.proctoring_backend.dto;

import java.time.LocalDateTime;

public class ProctoringEventRequest {

    private String sessionId;
    private String examId;
    private String candidateId;
    private String candidateName;
    private String eventType; // CLIPBOARD_PASTE_ATTEMPT, TAB_SWITCH, FULLSCREEN_EXIT, etc.
    private String severity;
    private String details;
    private String metadata;
    private LocalDateTime timestamp;

    public ProctoringEventRequest() {}

    public ProctoringEventRequest(String sessionId, String eventType, String severity, String details, String metadata) {
        this.sessionId = sessionId;
        this.eventType = eventType;
        this.severity = severity;
        this.details = details;
        this.metadata = metadata;
        this.timestamp = LocalDateTime.now();
    }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }

    public String getCandidateId() { return candidateId; }
    public void setCandidateId(String candidateId) { this.candidateId = candidateId; }

    public String getCandidateName() { return candidateName; }
    public void setCandidateName(String candidateName) { this.candidateName = candidateName; }

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
}
