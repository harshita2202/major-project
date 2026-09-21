package com.proctoring.proctoring_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "security_events")
public class SecurityEventEntity {

    @Id
    private String id;

    private String examId;
    private String studentId;
    private String type;
    private String severity;

    @Column(length = 1000)
    private String message;

    private LocalDateTime timestamp = LocalDateTime.now();

    public SecurityEventEntity() {}

    public SecurityEventEntity(String id, String examId, String studentId, String type, String severity, String message) {
        this.id = id;
        this.examId = examId;
        this.studentId = studentId;
        this.type = type;
        this.severity = severity;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getExamId() {
        return examId;
    }

    public void setExamId(String examId) {
        this.examId = examId;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
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

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
}
