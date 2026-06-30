package com.rms.polkole.repository;

import com.rms.polkole.entity.CheckInEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CheckInRepository extends JpaRepository<CheckInEntity, Integer> {
    Optional<CheckInEntity> findByReservationId(Integer reservationId);
}
