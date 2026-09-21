package com.proctoring.proctoring_backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.getOrDefault("username", "").trim();
        String password = credentials.getOrDefault("password", "").trim();
        String role = credentials.getOrDefault("role", "").trim();

        if (username.isEmpty() || password.isEmpty()) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "Username and password are required.");
            return ResponseEntity.badRequest().body(err);
        }

        // Validate credentials
        if ("invigilator".equalsIgnoreCase(role) || "admin".equalsIgnoreCase(username)) {
            if ("admin123".equals(password) || "password".equals(password)) {
                Map<String, Object> user = new HashMap<>();
                user.put("id", "INV001");
                user.put("name", "Dr. Robert Vance");
                user.put("email", "robert.vance@university.edu");
                user.put("role", "invigilator");

                Map<String, Object> resp = new HashMap<>();
                resp.put("success", true);
                resp.put("user", user);
                resp.put("token", "live-token-inv-" + System.currentTimeMillis());
                return ResponseEntity.ok(resp);
            }
        }

        if ("student".equalsIgnoreCase(role) || username.toUpperCase().startsWith("STU")) {
            if ("student123".equals(password) || "password".equals(password) || "123456".equals(password)) {
                Map<String, Object> user = new HashMap<>();
                user.put("id", username.isEmpty() ? "STU001" : username);
                user.put("name", "Alex Morgan");
                user.put("email", "alex.morgan@university.edu");
                user.put("role", "student");
                user.put("program", "B.Tech Computer Science & Engineering");
                user.put("semester", "6th Semester");

                Map<String, Object> resp = new HashMap<>();
                resp.put("success", true);
                resp.put("user", user);
                resp.put("token", "live-token-stu-" + System.currentTimeMillis());
                return ResponseEntity.ok(resp);
            }
        }

        // Generic fallback demo acceptance for ease of testing if correct passwords provided
        if ("admin123".equals(password)) {
            Map<String, Object> user = new HashMap<>();
            user.put("id", "INV001");
            user.put("name", username);
            user.put("role", "invigilator");

            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("user", user);
            resp.put("token", "live-token-inv-" + System.currentTimeMillis());
            return ResponseEntity.ok(resp);
        }

        if ("student123".equals(password)) {
            Map<String, Object> user = new HashMap<>();
            user.put("id", username);
            user.put("name", username);
            user.put("role", "student");

            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("user", user);
            resp.put("token", "live-token-stu-" + System.currentTimeMillis());
            return ResponseEntity.ok(resp);
        }

        Map<String, Object> err = new HashMap<>();
        err.put("success", false);
        err.put("message", "Invalid credentials. Please verify your ID and password.");
        return ResponseEntity.status(401).body(err);
    }
}
