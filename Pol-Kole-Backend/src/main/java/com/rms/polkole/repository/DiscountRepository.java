package com.rms.polkole.repository;

import com.rms.polkole.entity.DiscountEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface DiscountRepository extends JpaRepository<DiscountEntity, Integer> {
    Optional<DiscountEntity> findByCodeIgnoreCase(String code);
}
