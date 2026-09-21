package com.proctoring.proctoring_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "violations")
public class Violation {

    @Id
    private String id;

    private String candidateId;
    private String candidateName;
    private String candidateAvatar;
    private String examTitle;
    private String type;
    private String severity;
    private String timestamp;
    private String status;

    @Column(length = 2000)
    private String details;

    public Violation() {}

    public Violation(String id, String candidateId, String candidateName, String candidateAvatar,
                     String examTitle, String type, String severity, String timestamp, String status, String details) {
        this.id = id;
        this.candidateId = candidateId;
        this.candidateName = candidateName;
        this.candidateAvatar = candidateAvatar;
        this.examTitle = examTitle;
        this.type = type;
        this.severity = severity;
        this.timestamp = timestamp;
        this.status = status;
        this.details = details;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCandidateId() {
        return candidateId;
    }

    public void setCandidateId(String candidateId) {
        this.candidateId = candidateId;
    }

    public String getCandidateName() {
        return candidateName;
    }

    public void setCandidateName(String candidateName) {
        this.candidateName = candidateName;
    }

    public String getCandidateAvatar() {
        return candidateAvatar;
    }

    public void setCandidateAvatar(String candidateAvatar) {
        this.candidateAvatar = candidateAvatar;
    }

    public String getExamTitle() {
        return examTitle;
    }

    public void setExamTitle(String examTitle) {
        this.examTitle = examTitle;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }
}
