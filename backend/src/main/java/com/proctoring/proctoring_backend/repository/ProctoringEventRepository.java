package com.proctoring.proctoring_backend.repository;

import com.proctoring.proctoring_backend.entity.ProctoringEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProctoringEventRepository extends JpaRepository<ProctoringEvent, String> {
    List<ProctoringEvent> findBySessionIdOrderByTimestampDesc(String sessionId);
    List<ProctoringEvent> findByExamIdOrderByTimestampDesc(String examId);
    List<ProctoringEvent> findByCandidateIdOrderByTimestampDesc(String candidateId);
    long countBySessionId(String sessionId);
    long countBySessionIdAndEventType(String sessionId, String eventType);
}
