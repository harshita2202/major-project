package com.proctoring.proctoring_backend.repository;

import com.proctoring.proctoring_backend.entity.MobilePairingToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MobilePairingTokenRepository extends JpaRepository<MobilePairingToken, String> {
    Optional<MobilePairingToken> findFirstBySessionIdOrderByCreatedAtDesc(String sessionId);
    List<MobilePairingToken> findBySessionId(String sessionId);
    List<MobilePairingToken> findBySessionIdAndUsedFalse(String sessionId);
    void deleteBySessionId(String sessionId);
}
