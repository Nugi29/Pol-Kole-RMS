package com.rms.polkole.repository;

import com.rms.polkole.entity.LoyaltyPointEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LoyaltyPointRepository extends JpaRepository<LoyaltyPointEntity, Integer> {
    List<LoyaltyPointEntity> findByCustomerIdOrderByTransactionDateDesc(Integer customerId);
}
