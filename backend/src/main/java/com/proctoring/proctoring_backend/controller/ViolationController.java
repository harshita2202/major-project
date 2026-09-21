package com.proctoring.proctoring_backend.controller;

import com.proctoring.proctoring_backend.model.Violation;
import com.proctoring.proctoring_backend.repository.ViolationRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/violations")
public class ViolationController {

    private final ViolationRepository violationRepository;

    public ViolationController(ViolationRepository violationRepository) {
        this.violationRepository = violationRepository;
    }

    @GetMapping("/recent")
    public List<Violation> getRecentViolations() {
        return violationRepository.findTop10ByOrderByIdDesc();
    }

    @GetMapping
    public List<Violation> getAllViolations() {
        return violationRepository.findAll();
    }

    @PostMapping
    public Violation createViolation(@RequestBody Violation violation) {
        if (violation.getId() == null || violation.getId().isEmpty()) {
            violation.setId("VIO-" + System.currentTimeMillis() % 100000);
        }
        if (violation.getTimestamp() == null || violation.getTimestamp().isEmpty()) {
            violation.setTimestamp(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        }
        return violationRepository.save(violation);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable String id, @RequestBody Map<String, String> payload) {
        return violationRepository.findById(id).map(v -> {
            if (payload.containsKey("status")) {
                v.setStatus(payload.get("status"));
            }
            violationRepository.save(v);
            return ResponseEntity.ok(v);
        }).orElse(ResponseEntity.notFound().build());
    }
}
