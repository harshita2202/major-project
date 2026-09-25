package com.proctoring.proctoring_backend;

import com.proctoring.proctoring_backend.service.RiskScoringService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RiskScoringServiceTest {

    private RiskScoringService riskScoringService;

    @BeforeEach
    void setUp() {
        riskScoringService = new RiskScoringService();
    }

    @Test
    @DisplayName("Verify event point weights for all event types")
    void testEventPointWeights() {
        // LOW-RISK
        assertEquals(5, riskScoringService.getEventPoints("NETWORK_DISCONNECTION"));
        assertEquals(5, riskScoringService.getEventPoints("LONG_INACTIVITY"));

        // MEDIUM-RISK
        assertEquals(10, riskScoringService.getEventPoints("GAZE_WARNING"));
        assertEquals(15, riskScoringService.getEventPoints("FULLSCREEN_EXIT"));

        // HIGHER-RISK
        assertEquals(20, riskScoringService.getEventPoints("TAB_SWITCH"));
        assertEquals(25, riskScoringService.getEventPoints("CLIPBOARD_PASTE_ATTEMPT"));
        assertEquals(25, riskScoringService.getEventPoints("COPY_ATTEMPT"));
        assertEquals(25, riskScoringService.getEventPoints("PASTE_ATTEMPT"));
    }

    @Test
    @DisplayName("Verify risk level thresholds: 0-49 LOW, 50-79 MEDIUM, 80+ HIGH")
    void testRiskLevelThresholds() {
        assertEquals("LOW", riskScoringService.calculateRiskLevel(0));
        assertEquals("LOW", riskScoringService.calculateRiskLevel(25));
        assertEquals("LOW", riskScoringService.calculateRiskLevel(49));

        assertEquals("MEDIUM", riskScoringService.calculateRiskLevel(50));
        assertEquals("MEDIUM", riskScoringService.calculateRiskLevel(65));
        assertEquals("MEDIUM", riskScoringService.calculateRiskLevel(79));

        assertEquals("HIGH", riskScoringService.calculateRiskLevel(80));
        assertEquals("HIGH", riskScoringService.calculateRiskLevel(95));
        assertEquals("HIGH", riskScoringService.calculateRiskLevel(120));
    }

    @Test
    @DisplayName("Verify cumulative calculation example from specification")
    void testCumulativeCalculationExample() {
        // Example from spec:
        // TAB_SWITCH (+20)
        // TAB_SWITCH (+20)
        // FULLSCREEN_EXIT (+15)
        // Total = 55 -> MEDIUM
        int score = 0;
        score += riskScoringService.getEventPoints("TAB_SWITCH"); // 20
        score += riskScoringService.getEventPoints("TAB_SWITCH"); // 40
        score += riskScoringService.getEventPoints("FULLSCREEN_EXIT"); // 55

        assertEquals(55, score);
        assertEquals("MEDIUM", riskScoringService.calculateRiskLevel(score));
    }

    @Test
    @DisplayName("Verify feature-specific warnings match specification exactly")
    void testFeatureSpecificWarnings() {
        assertEquals(
                "Copy/Paste is not allowed. Further attempts may result in automatic submission of your exam.",
                riskScoringService.getFeatureWarning("CLIPBOARD_PASTE_ATTEMPT")
        );
        assertEquals(
                "Do not switch tabs during the examination. Further violations may result in automatic submission.",
                riskScoringService.getFeatureWarning("TAB_SWITCH")
        );
        assertEquals(
                "Please do not exit fullscreen mode. Further violations may result in automatic submission.",
                riskScoringService.getFeatureWarning("FULLSCREEN_EXIT")
        );
        assertEquals(
                "Please keep your attention on the examination screen. Repeated prolonged gaze deviation may increase your risk score.",
                riskScoringService.getFeatureWarning("GAZE_WARNING")
        );
        assertEquals(
                "You have been inactive for an extended period. Please continue your examination.",
                riskScoringService.getFeatureWarning("LONG_INACTIVITY")
        );
        assertEquals(
                "Network connection interrupted. Please check your connection and continue the examination.",
                riskScoringService.getFeatureWarning("NETWORK_DISCONNECTION")
        );
    }
}
