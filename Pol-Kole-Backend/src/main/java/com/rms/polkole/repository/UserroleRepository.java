package com.rms.polkole.repository;

import com.rms.polkole.entity.UserroleEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserroleRepository extends JpaRepository<UserroleEntity, Integer> {
    Optional<UserroleEntity> findByNameIgnoreCase(String name);
}

