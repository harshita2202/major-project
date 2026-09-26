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
            "Warning: Suspicious activity has been detected. Do not attempt cheating. Further violations may result in automatic exam submission.";

    public static final String AUTO_SUBMIT_MESSAGE =
            "Your exam has been automatically submitted because the proctoring risk threshold was reached.";

    public static final String WARNING_COPY =
            "Copying is not allowed during the exam. Further violations may result in automatic exam submission.";

    public static final String WARNING_PASTE =
            "Pasting is not allowed during the exam. Further violations may result in automatic exam submission.";

    public static final String WARNING_TAB_SWITCH =
            "Do not switch tabs during the exam. Further violations may result in automatic exam submission.";

    public static final String WARNING_FULLSCREEN_EXIT =
            "Do not exit fullscreen. Repeated violations may result in automatic exam submission.";

    public static final String WARNING_KEYBOARD_SHORTCUT =
            "Keyboard shortcuts are not allowed during the exam. Further violations may result in automatic exam submission.";

    public static final String WARNING_GAZE =
            "Please keep your attention on the exam screen. Repeated suspicious behavior may result in automatic submission.";

    public static final String WARNING_LONG_INACTIVITY =
            "You have been inactive for a long period. Please continue the exam.";

    public static final String WARNING_NETWORK =
            "Network connection was interrupted. Please maintain a stable connection.";

    /**
     * Calculate point weight based on proctoring event type.
     * LOW-RISK EVENTS:
     * - Network Disconnection = +5
     * - Long Inactivity = +5
     *
     * MEDIUM-RISK EVENTS:
     * - Gaze Warning = +10
     * - Keyboard Shortcut Attempt = +10
     * - Fullscreen Exit = +15
     *
     * HIGHER-RISK EVENTS:
     * - Tab Switch = +20
     * - Copy Attempt = +25
     * - Paste Attempt = +25
     */
    public int getEventPoints(String eventType) {
        if (eventType == null) return 10;
        return switch (eventType.trim().toUpperCase()) {
            case "NETWORK_DISCONNECTION", "NETWORK" -> 5;
            case "LONG_INACTIVITY", "INACTIVITY" -> 5;
            case "GAZE_WARNING", "GAZE" -> 10;
            case "SHORTCUT_ATTEMPT", "KEYBOARD_SHORTCUT", "KEYBOARD_SHORTCUT_ATTEMPT" -> 10;
            case "FULLSCREEN_EXIT" -> 15;
            case "TAB_SWITCH" -> 20;
            case "COPY_ATTEMPT", "COPY", "CUT_ATTEMPT", "CUT" -> 25;
            case "PASTE_ATTEMPT", "PASTE", "CLIPBOARD_PASTE_ATTEMPT" -> 25;
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
     * Return feature-specific warning message for the student.
     */
    public String getFeatureWarning(String eventType) {
        if (eventType == null) return "Suspicious activity detected. Please stay focused on the exam.";
        return switch (eventType.trim().toUpperCase()) {
            case "COPY_ATTEMPT", "COPY", "CUT_ATTEMPT", "CUT" -> WARNING_COPY;
            case "PASTE_ATTEMPT", "PASTE", "CLIPBOARD_PASTE_ATTEMPT" -> WARNING_PASTE;
            case "TAB_SWITCH" -> WARNING_TAB_SWITCH;
            case "FULLSCREEN_EXIT" -> WARNING_FULLSCREEN_EXIT;
            case "SHORTCUT_ATTEMPT", "KEYBOARD_SHORTCUT", "KEYBOARD_SHORTCUT_ATTEMPT" -> WARNING_KEYBOARD_SHORTCUT;
            case "GAZE_WARNING", "GAZE" -> WARNING_GAZE;
            case "LONG_INACTIVITY", "INACTIVITY" -> WARNING_LONG_INACTIVITY;
            case "NETWORK_DISCONNECTION", "NETWORK" -> WARNING_NETWORK;
            default -> "Please follow examination rules. Further violations may result in automatic exam submission.";
        };
    }
}
