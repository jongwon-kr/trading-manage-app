package io.tbill.backendapi.domain.strategy.repository;

import io.tbill.backendapi.domain.strategy.entity.StrategyPreset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StrategyPresetRepository extends JpaRepository<StrategyPreset, Long> {

    List<StrategyPreset> findByUserEmailOrderByUpdatedAtDesc(String userEmail);

    Optional<StrategyPreset> findByIdAndUserEmail(Long id, String userEmail);

    long countByUserEmail(String userEmail);

    boolean existsByUserEmailAndName(String userEmail, String name);

    boolean existsByUserEmailAndNameAndIdNot(String userEmail, String name, Long id);
}
