package com.proctoring.proctoring_backend.dto;

public class MobilePairingResponse {
    private String token;
    private String sessionId;
    private String examId;
    private String candidateId;
    private String candidateName;
    private String pairingUrl;
    private boolean mobileConnected;

    public MobilePairingResponse() {}

    public MobilePairingResponse(String token, String sessionId, String examId, String candidateId, String candidateName, String pairingUrl) {
        this.token = token;
        this.sessionId = sessionId;
        this.examId = examId;
        this.candidateId = candidateId;
        this.candidateName = candidateName;
        this.pairingUrl = pairingUrl;
        this.mobileConnected = false;
    }

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

    public String getPairingUrl() { return pairingUrl; }
    public void setPairingUrl(String pairingUrl) { this.pairingUrl = pairingUrl; }

    public boolean isMobileConnected() { return mobileConnected; }
    public void setMobileConnected(boolean mobileConnected) { this.mobileConnected = mobileConnected; }
}
