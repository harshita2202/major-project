package com.proctoring.proctoring_backend.repository;

import com.proctoring.proctoring_backend.entity.ExamAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ExamAssignmentRepository extends JpaRepository<ExamAssignment, String> {
    List<ExamAssignment> findByExamId(String examId);
    List<ExamAssignment> findByStudentId(String studentId);
    boolean existsByExamIdAndStudentId(String examId, String studentId);
    void deleteByExamId(String examId);
    void deleteByExamIdAndStudentId(String examId, String studentId);
}
