package com.rms.polkole.repository;

import com.rms.polkole.entity.PaymentMethodEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PaymentMethodRepository extends JpaRepository<PaymentMethodEntity, Integer> {
    Optional<PaymentMethodEntity> findByNameIgnoreCase(String name);
}
