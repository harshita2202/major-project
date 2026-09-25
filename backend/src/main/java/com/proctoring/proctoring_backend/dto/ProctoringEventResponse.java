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
}
