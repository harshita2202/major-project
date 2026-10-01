package com.proctoring.proctoring_backend.repository;

import com.proctoring.proctoring_backend.entity.SecurityEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SecurityEventRepository extends JpaRepository<SecurityEventEntity, String> {
    List<SecurityEventEntity> findByExamId(String examId);
}
