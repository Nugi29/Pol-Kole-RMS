package com.rms.polkole.repository;

import com.rms.polkole.entity.OrderStatusEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface OrderStatusRepository extends JpaRepository<OrderStatusEntity, Integer> {
    Optional<OrderStatusEntity> findByName(String name);
}
