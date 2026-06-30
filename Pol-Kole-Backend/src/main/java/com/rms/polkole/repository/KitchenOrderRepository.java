package com.rms.polkole.repository;

import com.rms.polkole.entity.KitchenOrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface KitchenOrderRepository extends JpaRepository<KitchenOrderEntity, Integer> {
    Optional<KitchenOrderEntity> findByOrderId(Integer orderId);

    @Query("SELECT k FROM KitchenOrderEntity k WHERE k.preparationStatus = 'RECEIVED' OR k.preparationStatus = 'PREPARING' ORDER BY k.startTime ASC")
    List<KitchenOrderEntity> findActiveKitchenOrders();
}
