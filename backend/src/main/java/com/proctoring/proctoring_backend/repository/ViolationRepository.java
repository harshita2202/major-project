package com.proctoring.proctoring_backend.repository;

import com.proctoring.proctoring_backend.model.Violation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ViolationRepository extends JpaRepository<Violation, String> {
    List<Violation> findTop10ByOrderByIdDesc();
}
