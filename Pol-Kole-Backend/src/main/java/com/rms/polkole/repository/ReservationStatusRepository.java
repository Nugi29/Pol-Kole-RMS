package com.rms.polkole.repository;

import com.rms.polkole.entity.ReservationStatusEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ReservationStatusRepository extends JpaRepository<ReservationStatusEntity, Integer> {
    Optional<ReservationStatusEntity> findByStatusNameIgnoreCase(String statusName);
}
