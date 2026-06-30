package com.rms.polkole.repository;

import com.rms.polkole.entity.CheckOutEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CheckOutRepository extends JpaRepository<CheckOutEntity, Integer> {
    Optional<CheckOutEntity> findByReservationId(Integer reservationId);
}
