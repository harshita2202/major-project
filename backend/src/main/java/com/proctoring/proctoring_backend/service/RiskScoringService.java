package com.proctoring.proctoring_backend.service;

import org.springframework.stereotype.Service;

@Service
public class RiskScoringService {

    // Thresholds
    public static final int MEDIUM_RISK_THRESHOLD = 50;
    public static final int HIGH_RISK_THRESHOLD = 80;

    // Risk Levels
    public static final String LEVEL_LOW = "LOW";
    public static final String LEVEL_MEDIUM = "MEDIUM";
    public static final String LEVEL_HIGH = "HIGH";

    // Auto-submission reason
    public static final String REASON_THRESHOLD_REACHED = "CHEATING_RISK_THRESHOLD_REACHED";

    // Warning Messages
    public static final String MEDIUM_RISK_WARNING =
            "Warning: Suspicious activity detected. Please do not attempt to cheat. " +
            "Further violations may result in automatic submission of your examination.";

    public static final String AUTO_SUBMIT_MESSAGE =
            "Your examination has been automatically submitted because the maximum allowed risk threshold was reached.";

    public static final String WARNING_COPY_PASTE =
            "Copy/Paste is not allowed. Further attempts may result in automatic submission of your exam.";

    public static final String WARNING_TAB_SWITCH =
            "Do not switch tabs during the examination. Further violations may result in automatic submission.";

    public static final String WARNING_FULLSCREEN_EXIT =
            "Please do not exit fullscreen mode. Further violations may result in automatic submission.";

    public static final String WARNING_GAZE =
            "Please keep your attention on the examination screen. Repeated prolonged gaze deviation may increase your risk score.";

    public static final String WARNING_LONG_INACTIVITY =
            "You have been inactive for an extended period. Please continue your examination.";

    public static final String WARNING_NETWORK =
            "Network connection interrupted. Please check your connection and continue the examination.";

    /**
     * Calculate point weight based on proctoring event type.
     * LOW-RISK:
     * - NETWORK_DISCONNECTION = +5
     * - LONG_INACTIVITY = +5
     * MEDIUM-RISK:
     * - GAZE_WARNING = +10
     * - FULLSCREEN_EXIT = +15
     * HIGHER-RISK:
     * - TAB_SWITCH = +20
     * - CLIPBOARD_PASTE_ATTEMPT = +25
     */
    public int getEventPoints(String eventType) {
        if (eventType == null) return 10;
        return switch (eventType.trim().toUpperCase()) {
            case "NETWORK_DISCONNECTION", "NETWORK" -> 5;
            case "LONG_INACTIVITY" -> 5;
            case "GAZE_WARNING", "GAZE" -> 10;
            case "FULLSCREEN_EXIT" -> 15;
            case "TAB_SWITCH" -> 20;
            case "CLIPBOARD_PASTE_ATTEMPT", "PASTE_ATTEMPT", "COPY_ATTEMPT", "CUT_ATTEMPT", "COPY_PASTE" -> 25;
            default -> 10;
        };
    }

    /**
     * Determine risk level from cumulative score:
     * 0–49   = LOW
     * 50–79  = MEDIUM
     * 80+    = HIGH
     */
    public String calculateRiskLevel(int totalScore) {
        if (totalScore >= HIGH_RISK_THRESHOLD) {
            return LEVEL_HIGH;
        } else if (totalScore >= MEDIUM_RISK_THRESHOLD) {
            return LEVEL_MEDIUM;
        } else {
            return LEVEL_LOW;
        }
    }

    /**
     * Return feature-specific warning message for the candidate.
     */
    public String getFeatureWarning(String eventType) {
        if (eventType == null) return "Suspicious activity detected. Please stay focused on the exam.";
        return switch (eventType.trim().toUpperCase()) {
            case "CLIPBOARD_PASTE_ATTEMPT", "PASTE_ATTEMPT", "COPY_ATTEMPT", "CUT_ATTEMPT", "COPY_PASTE" -> WARNING_COPY_PASTE;
            case "TAB_SWITCH" -> WARNING_TAB_SWITCH;
            case "FULLSCREEN_EXIT" -> WARNING_FULLSCREEN_EXIT;
            case "GAZE_WARNING", "GAZE" -> WARNING_GAZE;
            case "LONG_INACTIVITY" -> WARNING_LONG_INACTIVITY;
            case "NETWORK_DISCONNECTION", "NETWORK" -> WARNING_NETWORK;
            default -> "Please follow examination rules. Further violations may result in automatic submission.";
        };
    }
}
