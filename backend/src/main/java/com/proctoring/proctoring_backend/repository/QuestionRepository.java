package com.proctoring.proctoring_backend.repository;

import com.proctoring.proctoring_backend.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, String> {
    List<Question> findByExamId(String examId);
}
