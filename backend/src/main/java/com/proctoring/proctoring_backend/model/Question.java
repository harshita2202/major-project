package com.proctoring.proctoring_backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "questions")
public class Question {

    @Id
    private String id;

    private String examId;
    private String type; // "mcq" or "coding"
    private String title;

    @Column(length = 4000)
    private String question;

    @Column(length = 3000)
    private String optionsJson; // for MCQ e.g. ["A", "B", "C", "D"]

    private Integer correctIndex;
    private String difficulty;

    @Column(length = 4000)
    private String examplesJson; // for Coding e.g. [{input, output, explanation}]

    @Column(length = 2000)
    private String constraintsJson; // for Coding e.g. ["constraint 1", "constraint 2"]

    @Column(length = 6000)
    private String starterCodeJson; // for Coding e.g. {"javascript": "...", "python": "..."}

    public Question() {}

    public Question(String id, String examId, String type, String title, String question,
                    String optionsJson, Integer correctIndex, String difficulty,
                    String examplesJson, String constraintsJson, String starterCodeJson) {
        this.id = id;
        this.examId = examId;
        this.type = type;
        this.title = title;
        this.question = question;
        this.optionsJson = optionsJson;
        this.correctIndex = correctIndex;
        this.difficulty = difficulty;
        this.examplesJson = examplesJson;
        this.constraintsJson = constraintsJson;
        this.starterCodeJson = starterCodeJson;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }

    public String getOptionsJson() { return optionsJson; }
    public void setOptionsJson(String optionsJson) { this.optionsJson = optionsJson; }

    public Integer getCorrectIndex() { return correctIndex; }
    public void setCorrectIndex(Integer correctIndex) { this.correctIndex = correctIndex; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public String getExamplesJson() { return examplesJson; }
    public void setExamplesJson(String examplesJson) { this.examplesJson = examplesJson; }

    public String getConstraintsJson() { return constraintsJson; }
    public void setConstraintsJson(String constraintsJson) { this.constraintsJson = constraintsJson; }

    public String getStarterCodeJson() { return starterCodeJson; }
    public void setStarterCodeJson(String starterCodeJson) { this.starterCodeJson = starterCodeJson; }
}
