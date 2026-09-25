package com.proctoring.proctoring_backend.repository;

import com.proctoring.proctoring_backend.entity.ExamSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ExamSubmissionRepository extends JpaRepository<ExamSubmission, String> {
    List<ExamSubmission> findByExamId(String examId);
    List<ExamSubmission> findByStudentId(String studentId);
}
