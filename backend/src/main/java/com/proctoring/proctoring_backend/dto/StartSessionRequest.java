package com.proctoring.proctoring_backend.dto;

public class StartSessionRequest {

    private String examId;
    private String candidateId;
    private String candidateName;
    private Integer timeRemainingSeconds;

    public StartSessionRequest() {}

    public StartSessionRequest(String examId, String candidateId, String candidateName, Integer timeRemainingSeconds) {
        this.examId = examId;
        this.candidateId = candidateId;
        this.candidateName = candidateName;
        this.timeRemainingSeconds = timeRemainingSeconds;
    }

    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }

    public String getCandidateId() { return candidateId; }
    public void setCandidateId(String candidateId) { this.candidateId = candidateId; }

    public String getCandidateName() { return candidateName; }
    public void setCandidateName(String candidateName) { this.candidateName = candidateName; }

    public Integer getTimeRemainingSeconds() { return timeRemainingSeconds; }
    public void setTimeRemainingSeconds(Integer timeRemainingSeconds) { this.timeRemainingSeconds = timeRemainingSeconds; }
}
