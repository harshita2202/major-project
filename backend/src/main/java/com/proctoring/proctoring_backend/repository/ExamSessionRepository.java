package com.proctoring.proctoring_backend.repository;

import com.proctoring.proctoring_backend.entity.ExamSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamSessionRepository extends JpaRepository<ExamSession, String> {
    List<ExamSession> findByCandidateId(String candidateId);
    List<ExamSession> findByExamId(String examId);
    Optional<ExamSession> findByCandidateIdAndExamIdAndStatus(String candidateId, String examId, String status);
    Optional<ExamSession> findTopByCandidateIdAndExamIdOrderByCreatedAtDesc(String candidateId, String examId);
    List<ExamSession> findByStatusIn(List<String> statuses);
    List<ExamSession> findByExamIdAndStatusIn(String examId, List<String> statuses);
}
