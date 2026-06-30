package com.rms.polkole.repository;

import com.rms.polkole.entity.RoomEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RoomRepository extends JpaRepository<RoomEntity, Integer> {
    @Query("SELECT r FROM RoomEntity r WHERE r.isDeleted = false " +
           "AND (:status IS NULL OR r.status = :status) " +
           "AND (:capacity IS NULL OR r.capacity >= :capacity)")
    Page<RoomEntity> filterRooms(
        @Param("status") String status,
        @Param("capacity") Integer capacity,
        Pageable pageable
    );
}
