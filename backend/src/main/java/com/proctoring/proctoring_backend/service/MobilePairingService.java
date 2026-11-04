package com.proctoring.proctoring_backend.service;

import com.proctoring.proctoring_backend.dto.MobilePairingResponse;
import com.proctoring.proctoring_backend.entity.MobilePairingToken;
import com.proctoring.proctoring_backend.repository.MobilePairingTokenRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class MobilePairingService {

    private final MobilePairingTokenRepository tokenRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public MobilePairingService(MobilePairingTokenRepository tokenRepository,
                                 SimpMessagingTemplate messagingTemplate) {
        this.tokenRepository = tokenRepository;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Generate a new pairing token for an exam session.
     * Invalidates any existing token for the session first.
     */
    @Transactional
    public MobilePairingResponse generatePairingToken(String sessionId, String examId,
                                                       String candidateId, String candidateName,
                                                       String frontendBaseUrl) {
        // Remove any existing token for this session
        tokenRepository.deleteBySessionId(sessionId);

        String token = UUID.randomUUID().toString().replace("-", "");
        String pairingUrl = frontendBaseUrl + "/mobile-camera?token=" + token;

        MobilePairingToken mpt = new MobilePairingToken(token, sessionId, examId, candidateId, candidateName);
        tokenRepository.save(mpt);

        return new MobilePairingResponse(token, sessionId, examId, candidateId, candidateName, pairingUrl);
    }

    /**
     * Validate a pairing token (called by mobile device when it opens the pairing URL).
     * Returns the token details if valid.
     */
    public Optional<MobilePairingToken> validateToken(String token) {
        return tokenRepository.findById(token)
                .filter(t -> !t.isExpired());
    }

    /**
     * Mark mobile as connected for a session, broadcast status to laptop.
     */
    @Transactional
    public void markMobileConnected(String token, boolean connected) {
        tokenRepository.findById(token).ifPresent(t -> {
            t.setMobileConnected(connected);
            tokenRepository.save(t);
            // Broadcast connection status to laptop exam session
            messagingTemplate.convertAndSend(
                "/topic/mobile-status/" + t.getSessionId(),
                (Object) Map.of(
                    "sessionId", t.getSessionId(),
                    "mobileConnected", connected,
                    "candidateId", t.getCandidateId(),
                    "token", token
                )
            );
            // Also broadcast to proctors
            messagingTemplate.convertAndSend(
                "/topic/examiner/mobile-status",
                (Object) Map.of(
                    "sessionId", t.getSessionId(),
                    "candidateId", t.getCandidateId(),
                    "candidateName", t.getCandidateName() != null ? t.getCandidateName() : "",
                    "mobileConnected", connected
                )
            );
        });
    }

    /**
     * Get current mobile connection status for a session.
     */
    public boolean isMobileConnected(String sessionId) {
        return tokenRepository.findFirstBySessionIdOrderByCreatedAtDesc(sessionId)
                .map(MobilePairingToken::isMobileConnected)
                .orElse(false);
    }

    /**
     * Invalidate all tokens for a session (called when exam ends).
     */
    @Transactional
    public void invalidateSessionTokens(String sessionId) {
        tokenRepository.deleteBySessionId(sessionId);
    }
}
