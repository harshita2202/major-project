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
    @DisplayName("Verify event point weights for all event types including VoiceGuard events")
    void testEventPointWeights() {
        // LOW-RISK
        assertEquals(3, riskScoringService.getEventPoints("NETWORK_INTERRUPTION"));
        assertEquals(3, riskScoringService.getEventPoints("NETWORK_DISCONNECTION"));
        assertEquals(5, riskScoringService.getEventPoints("LONG_INACTIVITY"));
        assertEquals(5, riskScoringService.getEventPoints("SILENT_MIC"));

        // MEDIUM-RISK
        assertEquals(8, riskScoringService.getEventPoints("GAZE_WARNING"));
        assertEquals(10, riskScoringService.getEventPoints("FULLSCREEN_EXIT"));
        assertEquals(15, riskScoringService.getEventPoints("VOICE_WARNING"));
        assertEquals(15, riskScoringService.getEventPoints("MULTIPLE_VOICES"));
        assertEquals(15, riskScoringService.getEventPoints("AUDIO_WARNING"));

        // HIGHER-RISK
        assertEquals(15, riskScoringService.getEventPoints("TAB_SWITCH"));
        assertEquals(20, riskScoringService.getEventPoints("CLIPBOARD_PASTE_ATTEMPT"));
        assertEquals(20, riskScoringService.getEventPoints("COPY_ATTEMPT"));
        assertEquals(20, riskScoringService.getEventPoints("PASTE_ATTEMPT"));
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
    @DisplayName("Verify cumulative calculation with VoiceGuard warnings")
    void testCumulativeCalculationWithVoiceWarnings() {
        int score = 0;
        score += riskScoringService.getEventPoints("VOICE_WARNING"); // 15
        score += riskScoringService.getEventPoints("VOICE_WARNING"); // 30
        score += riskScoringService.getEventPoints("TAB_SWITCH");    // 45
        assertEquals("LOW", riskScoringService.calculateRiskLevel(score));

        score += riskScoringService.getEventPoints("VOICE_WARNING"); // 60 -> MEDIUM
        assertEquals(60, score);
        assertEquals("MEDIUM", riskScoringService.calculateRiskLevel(score));
    }

    @Test
    @DisplayName("Verify feature-specific warnings match specification including VoiceGuard")
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
                RiskScoringService.WARNING_VOICE,
                riskScoringService.getFeatureWarning("VOICE_WARNING")
        );
        assertEquals(
                RiskScoringService.WARNING_VOICE,
                riskScoringService.getFeatureWarning("MULTIPLE_VOICES")
        );
        assertEquals(
                RiskScoringService.WARNING_SILENT_MIC,
                riskScoringService.getFeatureWarning("SILENT_MIC")
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
