package com.proctoring.proctoring_backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "mobile_pairing_tokens")
public class MobilePairingToken {

    @Id
    private String token; // UUID

    @Column(name = "session_id", nullable = false)
    private String sessionId;

    @Column(name = "exam_id", nullable = false)
    private String examId;

    @Column(name = "candidate_id", nullable = false)
    private String candidateId;

    @Column(name = "candidate_name")
    private String candidateName;

    @Column(name = "used")
    private boolean used = false;

    @Column(name = "mobile_connected")
    private boolean mobileConnected = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    public MobilePairingToken() {}

    public MobilePairingToken(String token, String sessionId, String examId, String candidateId, String candidateName) {
        this.token = token;
        this.sessionId = sessionId;
        this.examId = examId;
        this.candidateId = candidateId;
        this.candidateName = candidateName;
        this.createdAt = LocalDateTime.now();
        this.expiresAt = LocalDateTime.now().plusMinutes(180); // expires after 3 hours (exam duration)
    }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    // Getters and setters for all fields
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }

    public String getCandidateId() { return candidateId; }
    public void setCandidateId(String candidateId) { this.candidateId = candidateId; }

    public String getCandidateName() { return candidateName; }
    public void setCandidateName(String candidateName) { this.candidateName = candidateName; }

    public boolean isUsed() { return used; }
    public void setUsed(boolean used) { this.used = used; }

    public boolean isMobileConnected() { return mobileConnected; }
    public void setMobileConnected(boolean mobileConnected) { this.mobileConnected = mobileConnected; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
}
