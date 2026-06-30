package com.rms.polkole.repository;

import com.rms.polkole.entity.InventoryItemEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItemEntity, Integer> {
    Optional<InventoryItemEntity> findByItemName(String itemName);

    @Query("SELECT i FROM InventoryItemEntity i WHERE i.isDeleted = false " +
           "AND (:search IS NULL OR LOWER(i.itemName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(i.supplier) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<InventoryItemEntity> filterInventory(@Param("search") String search, Pageable pageable);

    @Query("SELECT i FROM InventoryItemEntity i WHERE i.isDeleted = false AND i.quantity <= i.minimumStockLevel")
    List<InventoryItemEntity> findLowStockItems();
}
