package com.proctoring.proctoring_backend.repository;

import com.proctoring.proctoring_backend.entity.Exam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExamRepository extends JpaRepository<Exam, String> {
}
