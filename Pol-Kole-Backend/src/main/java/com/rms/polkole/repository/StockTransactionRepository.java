package com.rms.polkole.repository;

import com.rms.polkole.entity.StockTransactionEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StockTransactionRepository extends JpaRepository<StockTransactionEntity, Integer> {
    Page<StockTransactionEntity> findByInventoryItemIdOrderByTransactionTimeDesc(Integer itemId, Pageable pageable);
}
