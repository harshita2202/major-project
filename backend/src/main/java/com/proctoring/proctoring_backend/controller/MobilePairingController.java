package com.proctoring.proctoring_backend.controller;

import com.proctoring.proctoring_backend.dto.MobilePairingResponse;
import com.proctoring.proctoring_backend.entity.MobilePairingToken;
import com.proctoring.proctoring_backend.service.MobilePairingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Enumeration;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/mobile-pairing")
public class MobilePairingController {

    private final MobilePairingService mobilePairingService;

    public MobilePairingController(MobilePairingService mobilePairingService) {
        this.mobilePairingService = mobilePairingService;
    }

    /**
     * Resolve the most suitable local network IPv4 address for mobile access.
     */
    private String resolveLocalNetworkIp() {
        String bestIp = null;
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface iface = interfaces.nextElement();
                if (iface.isLoopback() || !iface.isUp()) continue;

                String name = iface.getName().toLowerCase();
                String display = iface.getDisplayName().toLowerCase();

                // Skip virtual adapters (e.g., VirtualBox, VMware, WSL vEthernet)
                if (display.contains("virtual") || display.contains("vmware") || display.contains("vbox") || display.contains("vethernet")) {
                    continue;
                }

                Enumeration<InetAddress> addresses = iface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    if (addr instanceof Inet4Address && !addr.isLoopbackAddress()) {
                        String host = addr.getHostAddress();
                        if (host.startsWith("169.254.") || host.startsWith("127.")) continue;

                        // Wi-Fi or Wireless adapters take top priority
                        if (display.contains("wi-fi") || display.contains("wireless") || name.contains("wlan")) {
                            return host;
                        }
                        if (bestIp == null && !host.startsWith("192.168.56.")) {
                            bestIp = host;
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        return bestIp != null ? bestIp : "localhost";
    }

    /**
     * GET /api/mobile-pairing/network-ip
     * Returns the detected LAN IPv4 of this host.
     */
    @GetMapping("/network-ip")
    public ResponseEntity<Map<String, String>> getNetworkIp() {
        return ResponseEntity.ok(Map.of("ip", resolveLocalNetworkIp()));
    }

    /**
     * POST /api/mobile-pairing/generate
     * Called by the laptop exam interface to generate a pairing token/QR code.
     * Body: { sessionId, examId, candidateId, candidateName, frontendBaseUrl }
     */
    @PostMapping("/generate")
    public ResponseEntity<MobilePairingResponse> generateToken(@RequestBody Map<String, String> body) {
        String sessionId = body.get("sessionId");
        String examId = body.get("examId");
        String candidateId = body.get("candidateId");
        String candidateName = body.get("candidateName");
        String frontendBaseUrl = body.getOrDefault("frontendBaseUrl", "https://localhost:5173");

        if (sessionId == null || examId == null || candidateId == null) {
            return ResponseEntity.badRequest().build();
        }

        // If URL uses localhost or 127.0.0.1, replace with the actual LAN IP so mobile devices can reach it
        String lanIp = resolveLocalNetworkIp();
        if (!"localhost".equals(lanIp)) {
            if (frontendBaseUrl.contains("localhost")) {
                frontendBaseUrl = frontendBaseUrl.replace("localhost", lanIp);
            } else if (frontendBaseUrl.contains("127.0.0.1")) {
                frontendBaseUrl = frontendBaseUrl.replace("127.0.0.1", lanIp);
            }
        }

        // Force HTTPS for mobile camera security compliance (browsers block camera over insecure HTTP)
        if (frontendBaseUrl.startsWith("http://")) {
            frontendBaseUrl = frontendBaseUrl.replace("http://", "https://");
        }

        MobilePairingResponse response = mobilePairingService.generatePairingToken(
                sessionId, examId, candidateId, candidateName, frontendBaseUrl);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/mobile-pairing/validate?token=xxx
     * Called by the mobile browser to validate the token and get session info.
     */
    @GetMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateToken(@RequestParam String token) {
        Optional<MobilePairingToken> mpt = mobilePairingService.validateToken(token);
        if (mpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Token invalid or expired"));
        }
        MobilePairingToken t = mpt.get();
        return ResponseEntity.ok(Map.of(
            "valid", true,
            "sessionId", t.getSessionId(),
            "examId", t.getExamId(),
            "candidateId", t.getCandidateId(),
            "candidateName", t.getCandidateName() != null ? t.getCandidateName() : "",
            "token", token
        ));
    }

    /**
     * POST /api/mobile-pairing/status
     * Called by mobile to signal connection / disconnection.
     * Body: { token, connected }
     */
    @PostMapping("/status")
    public ResponseEntity<Map<String, Object>> updateStatus(@RequestBody Map<String, Object> body) {
        String token = (String) body.get("token");
        boolean connected = Boolean.TRUE.equals(body.get("connected"));

        if (token == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Token required"));
        }

        mobilePairingService.markMobileConnected(token, connected);
        return ResponseEntity.ok(Map.of("success", true, "connected", connected));
    }

    /**
     * GET /api/mobile-pairing/session-status?sessionId=xxx
     * Called by proctor/laptop to check current mobile connection status.
     */
    @GetMapping("/session-status")
    public ResponseEntity<Map<String, Object>> getSessionStatus(@RequestParam String sessionId) {
        boolean connected = mobilePairingService.isMobileConnected(sessionId);
        return ResponseEntity.ok(Map.of("sessionId", sessionId, "mobileConnected", connected));
    }
}
