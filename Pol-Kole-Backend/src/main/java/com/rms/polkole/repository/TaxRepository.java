package com.rms.polkole.repository;

import com.rms.polkole.entity.TaxEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TaxRepository extends JpaRepository<TaxEntity, Integer> {
    List<TaxEntity> findByActiveTrue();
}
