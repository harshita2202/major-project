package com.proctoring.proctoring_backend.repository;

import com.proctoring.proctoring_backend.entity.Candidate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CandidateRepository extends JpaRepository<Candidate, String> {
}
