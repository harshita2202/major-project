package com.proctoring.proctoring_backend.controller;

import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/settings")
public class SettingController {

    private final Map<String, Object> settings = new ConcurrentHashMap<>();

    public SettingController() {
        settings.put("audioThreshold", 75);
        settings.put("gazeTracking", true);
        settings.put("browserLock", true);
        settings.put("faceVerification", true);
        settings.put("notificationEmail", "admin@proctoring.edu");
    }

    @GetMapping
    public Map<String, Object> getSettings() {
        return new HashMap<>(settings);
    }

    @PutMapping
    public Map<String, Object> updateSettings(@RequestBody Map<String, Object> newSettings) {
        settings.putAll(newSettings);
        return new HashMap<>(settings);
    }
}
