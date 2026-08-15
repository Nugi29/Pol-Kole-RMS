package com.rms.polkole.repository;

import com.rms.polkole.entity.TableLocationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface TableLocationRepository extends JpaRepository<TableLocationEntity, Integer> {
    Optional<TableLocationEntity> findByName(String name);
    Optional<TableLocationEntity> findByCode(String code);
}