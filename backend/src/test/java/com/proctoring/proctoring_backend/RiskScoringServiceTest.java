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
        assertEquals(5, riskScoringService.getEventPoints("NETWORK_INTERRUPTION"));
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
                RiskScoringService.WARNING_PASTE,
                riskScoringService.getFeatureWarning("CLIPBOARD_PASTE_ATTEMPT")
        );
        assertEquals(
                RiskScoringService.WARNING_TAB_SWITCH,
                riskScoringService.getFeatureWarning("TAB_SWITCH")
        );
        assertEquals(
                RiskScoringService.WARNING_FULLSCREEN_EXIT,
                riskScoringService.getFeatureWarning("FULLSCREEN_EXIT")
        );
        assertEquals(
                RiskScoringService.WARNING_GAZE,
                riskScoringService.getFeatureWarning("GAZE_WARNING")
        );
        assertEquals(
                RiskScoringService.WARNING_LONG_INACTIVITY,
                riskScoringService.getFeatureWarning("LONG_INACTIVITY")
        );
        assertEquals(
                RiskScoringService.WARNING_NETWORK,
                riskScoringService.getFeatureWarning("NETWORK_INTERRUPTION")
        );
        assertEquals(
                RiskScoringService.WARNING_NETWORK,
                riskScoringService.getFeatureWarning("NETWORK_DISCONNECTION")
        );
    }
}
