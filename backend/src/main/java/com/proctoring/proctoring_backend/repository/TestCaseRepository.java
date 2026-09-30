package com.proctoring.proctoring_backend.repository;

import com.proctoring.proctoring_backend.entity.TestCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TestCaseRepository extends JpaRepository<TestCase, String> {
    List<TestCase> findByQuestionIdOrderByOrderIndexAsc(String questionId);
    List<TestCase> findByExamIdOrderByOrderIndexAsc(String examId);
    List<TestCase> findByQuestionIdAndIsSampleTrueOrderByOrderIndexAsc(String questionId);
    void deleteByExamId(String examId);
    void deleteByQuestionId(String questionId);
}
