package com.rms.polkole.repository;

import com.rms.polkole.entity.UserroleEntity;
import com.rms.polkole.entity.UserstatusEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserstatusRepository extends JpaRepository<UserstatusEntity, Integer> {
    Optional<UserstatusEntity> findByNameIgnoreCase(String name);
}

