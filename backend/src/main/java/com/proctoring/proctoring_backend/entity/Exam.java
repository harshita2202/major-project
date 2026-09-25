package com.proctoring.proctoring_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "exams")
public class Exam {

    @Id
    private String id;

    private String code;
    private String name;

    @Column(length = 2000)
    private String description;

    private String date;
    private String time;
    private String duration;
    private int studentsCount;
    private String status;
    private String proctoringMode;
    private String type; // "mcq" or "coding"
    private int totalQuestions;
    private LocalDateTime createdAt = LocalDateTime.now();

    public Exam() {}

    public Exam(String id, String code, String name, String description, String date, String time,
                String duration, int studentsCount, String status, String proctoringMode, String type, int totalQuestions) {
        this.id = id;
        this.code = code;
        this.name = name;
        this.description = description;
        this.date = date;
        this.time = time;
        this.duration = duration;
        this.studentsCount = studentsCount;
        this.status = status;
        this.proctoringMode = proctoringMode;
        this.type = type;
        this.totalQuestions = totalQuestions;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }

    public String getDuration() { return duration; }
    public void setDuration(String duration) { this.duration = duration; }

    public int getStudentsCount() { return studentsCount; }
    public void setStudentsCount(int studentsCount) { this.studentsCount = studentsCount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getProctoringMode() { return proctoringMode; }
    public void setProctoringMode(String proctoringMode) { this.proctoringMode = proctoringMode; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public int getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(int totalQuestions) { this.totalQuestions = totalQuestions; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
