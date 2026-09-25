package com.proctoring.proctoring_backend.dto;

import java.util.ArrayList;
import java.util.List;

public class ExaminerLiveRiskResponse {

    private List<CandidateRiskSummary> highRisk = new ArrayList<>();
    private List<CandidateRiskSummary> mediumRisk = new ArrayList<>();
    private List<CandidateRiskSummary> lowRisk = new ArrayList<>();
    private int totalCandidates;
    private int activeCount;
    private int autoSubmittedCount;

    public ExaminerLiveRiskResponse() {}

    public ExaminerLiveRiskResponse(List<CandidateRiskSummary> highRisk,
                                    List<CandidateRiskSummary> mediumRisk,
                                    List<CandidateRiskSummary> lowRisk) {
        this.highRisk = highRisk != null ? highRisk : new ArrayList<>();
        this.mediumRisk = mediumRisk != null ? mediumRisk : new ArrayList<>();
        this.lowRisk = lowRisk != null ? lowRisk : new ArrayList<>();
        this.totalCandidates = this.highRisk.size() + this.mediumRisk.size() + this.lowRisk.size();
    }

    public List<CandidateRiskSummary> getHighRisk() { return highRisk; }
    public void setHighRisk(List<CandidateRiskSummary> highRisk) { this.highRisk = highRisk; }

    public List<CandidateRiskSummary> getMediumRisk() { return mediumRisk; }
    public void setMediumRisk(List<CandidateRiskSummary> mediumRisk) { this.mediumRisk = mediumRisk; }

    public List<CandidateRiskSummary> getLowRisk() { return lowRisk; }
    public void setLowRisk(List<CandidateRiskSummary> lowRisk) { this.lowRisk = lowRisk; }

    public int getTotalCandidates() { return totalCandidates; }
    public void setTotalCandidates(int totalCandidates) { this.totalCandidates = totalCandidates; }

    public int getActiveCount() { return activeCount; }
    public void setActiveCount(int activeCount) { this.activeCount = activeCount; }

    public int getAutoSubmittedCount() { return autoSubmittedCount; }
    public void setAutoSubmittedCount(int autoSubmittedCount) { this.autoSubmittedCount = autoSubmittedCount; }
}
