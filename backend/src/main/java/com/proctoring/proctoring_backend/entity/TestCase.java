package com.proctoring.proctoring_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "coding_test_cases")
public class TestCase {

    @Id
    private String id;

    @Column(name = "question_id", nullable = false)
    private String questionId;

    @Column(name = "exam_id")
    private String examId;

    @Column(columnDefinition = "TEXT")
    private String input;

    @Column(columnDefinition = "TEXT")
    private String expectedOutput;

    private boolean isSample = false; // true = public sample test case, false = hidden test case
    private int marks = 1;
    private int orderIndex = 0;

    public TestCase() {}

    public TestCase(String id, String questionId, String examId, String input, String expectedOutput, boolean isSample, int marks, int orderIndex) {
        this.id = id;
        this.questionId = questionId;
        this.examId = examId;
        this.input = input;
        this.expectedOutput = expectedOutput;
        this.isSample = isSample;
        this.marks = marks;
        this.orderIndex = orderIndex;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getQuestionId() { return questionId; }
    public void setQuestionId(String questionId) { this.questionId = questionId; }

    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }

    public String getInput() { return input; }
    public void setInput(String input) { this.input = input; }

    public String getExpectedOutput() { return expectedOutput; }
    public void setExpectedOutput(String expectedOutput) { this.expectedOutput = expectedOutput; }

    public boolean isSample() { return isSample; }
    public void setSample(boolean sample) { isSample = sample; }

    public int getMarks() { return marks; }
    public void setMarks(int marks) { this.marks = marks; }

    public int getOrderIndex() { return orderIndex; }
    public void setOrderIndex(int orderIndex) { this.orderIndex = orderIndex; }
}
