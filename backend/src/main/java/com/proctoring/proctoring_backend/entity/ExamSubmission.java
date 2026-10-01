package com.proctoring.proctoring_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "exam_submissions")
public class ExamSubmission {

    @Id
    private String id;

    private String examId;
    private String studentId;
    private String studentName;

    @Column(columnDefinition = "TEXT")
    private String answersJson;

    private int score; // marks obtained
    private int totalQuestions;
    private Integer totalMarks = 0;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime submittedAt = LocalDateTime.now();
    private String status; // "submitted", "completed", "evaluated", "terminated", "auto_submitted"

    private Boolean autoSubmitted = false;
    private String submissionReason;
    private Integer finalRiskScore = 0;
    private String finalRiskLevel = "LOW";
    private Boolean cheatingFlag = false;

    @Column(columnDefinition = "TEXT")
    private String proctoringSummaryJson; // breakdown e.g. tab switches, fullscreen exits, etc.

    @Column(columnDefinition = "TEXT")
    private String codingResultsJson; // test cases passed, per-problem breakdown

    private Integer mcqScore = 0;
    private Integer codingScore = 0;

    public ExamSubmission() {}

    public ExamSubmission(String id, String examId, String studentId, String studentName,
                          String answersJson, int score, int totalQuestions, String status) {
        this.id = id;
        this.examId = examId;
        this.studentId = studentId;
        this.studentName = studentName;
        this.answersJson = answersJson;
        this.score = score;
        this.totalQuestions = totalQuestions;
        this.status = status;
        this.submittedAt = LocalDateTime.now();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getAnswersJson() { return answersJson; }
    public void setAnswersJson(String answersJson) { this.answersJson = answersJson; }

    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }

    public int getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(int totalQuestions) { this.totalQuestions = totalQuestions; }

    public int getTotalMarks() { return totalMarks != null ? totalMarks : 0; }
    public void setTotalMarks(Integer totalMarks) { this.totalMarks = totalMarks != null ? totalMarks : 0; }

    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }

    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(LocalDateTime submittedAt) { this.submittedAt = submittedAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isAutoSubmitted() { return Boolean.TRUE.equals(autoSubmitted); }
    public void setAutoSubmitted(Boolean autoSubmitted) { this.autoSubmitted = autoSubmitted != null && autoSubmitted; }

    public String getSubmissionReason() { return submissionReason; }
    public void setSubmissionReason(String submissionReason) { this.submissionReason = submissionReason; }

    public int getFinalRiskScore() { return finalRiskScore != null ? finalRiskScore : 0; }
    public void setFinalRiskScore(Integer finalRiskScore) { this.finalRiskScore = finalRiskScore != null ? finalRiskScore : 0; }

    public String getFinalRiskLevel() { return finalRiskLevel != null ? finalRiskLevel : "LOW"; }
    public void setFinalRiskLevel(String finalRiskLevel) { this.finalRiskLevel = finalRiskLevel; }

    public boolean isCheatingFlag() { return Boolean.TRUE.equals(cheatingFlag); }
    public void setCheatingFlag(Boolean cheatingFlag) { this.cheatingFlag = cheatingFlag != null && cheatingFlag; }

    public String getProctoringSummaryJson() { return proctoringSummaryJson; }
    public void setProctoringSummaryJson(String proctoringSummaryJson) { this.proctoringSummaryJson = proctoringSummaryJson; }

    public String getCodingResultsJson() { return codingResultsJson; }
    public void setCodingResultsJson(String codingResultsJson) { this.codingResultsJson = codingResultsJson; }

    public int getMcqScore() { return mcqScore != null ? mcqScore : 0; }
    public void setMcqScore(Integer mcqScore) { this.mcqScore = mcqScore != null ? mcqScore : 0; }

    public int getCodingScore() { return codingScore != null ? codingScore : 0; }
    public void setCodingScore(Integer codingScore) { this.codingScore = codingScore != null ? codingScore : 0; }
}
