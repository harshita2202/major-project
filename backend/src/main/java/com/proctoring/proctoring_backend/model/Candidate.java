package com.proctoring.proctoring_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "candidates")
public class Candidate {

    @Id
    private String id;

    private String candidate;
    private String avatar;
    private String email;
    private String exam;
    private String timeRemaining;
    private String totalDuration;
    private int progress;
    private String status;
    private String risk;
    private int riskScore;

    @Column(length = 3000)
    private String checksJson;

    @Column(length = 5000)
    private String timelineJson;

    public Candidate() {}

    public Candidate(String id, String candidate, String avatar, String email, String exam,
                     String timeRemaining, String totalDuration, int progress, String status,
                     String risk, int riskScore, String checksJson, String timelineJson) {
        this.id = id;
        this.candidate = candidate;
        this.avatar = avatar;
        this.email = email;
        this.exam = exam;
        this.timeRemaining = timeRemaining;
        this.totalDuration = totalDuration;
        this.progress = progress;
        this.status = status;
        this.risk = risk;
        this.riskScore = riskScore;
        this.checksJson = checksJson;
        this.timelineJson = timelineJson;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCandidate() { return candidate; }
    public void setCandidate(String candidate) { this.candidate = candidate; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getExam() { return exam; }
    public void setExam(String exam) { this.exam = exam; }

    public String getTimeRemaining() { return timeRemaining; }
    public void setTimeRemaining(String timeRemaining) { this.timeRemaining = timeRemaining; }

    public String getTotalDuration() { return totalDuration; }
    public void setTotalDuration(String totalDuration) { this.totalDuration = totalDuration; }

    public int getProgress() { return progress; }
    public void setProgress(int progress) { this.progress = progress; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRisk() { return risk; }
    public void setRisk(String risk) { this.risk = risk; }

    public int getRiskScore() { return riskScore; }
    public void setRiskScore(int riskScore) { this.riskScore = riskScore; }

    public String getChecksJson() { return checksJson; }
    public void setChecksJson(String checksJson) { this.checksJson = checksJson; }

    public String getTimelineJson() { return timelineJson; }
    public void setTimelineJson(String timelineJson) { this.timelineJson = timelineJson; }
}
