package io.tbill.backendapi.domain.journal.repository;

import io.tbill.backendapi.domain.journal.entity.Journal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JournalRepository extends JpaRepository<Journal, Long> {
    List<Journal> findByAuthorEmailOrderByCreatedAtDesc(String email);
}