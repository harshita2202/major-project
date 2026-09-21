package com.proctoring.proctoring_backend.model;

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

    private int score;
    private int totalQuestions;
    private LocalDateTime submittedAt = LocalDateTime.now();
    private String status; // "submitted", "evaluated"

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

    public String getStudentName() {
        return studentName;
    }

    public void setStudentName(String studentName) {
        this.studentName = studentName;
    }

    public String getAnswersJson() {
        return answersJson;
    }

    public void setAnswersJson(String answersJson) {
        this.answersJson = answersJson;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public int getTotalQuestions() {
        return totalQuestions;
    }

    public void setTotalQuestions(int totalQuestions) {
        this.totalQuestions = totalQuestions;
    }

    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(LocalDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
