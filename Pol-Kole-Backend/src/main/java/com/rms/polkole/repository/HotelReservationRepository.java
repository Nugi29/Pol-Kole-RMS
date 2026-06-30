package com.rms.polkole.repository;

import com.rms.polkole.entity.HotelReservationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface HotelReservationRepository extends JpaRepository<HotelReservationEntity, Integer> {
    List<HotelReservationEntity> findByCustomerId(Integer customerId);

    @Query("SELECT COUNT(r) > 0 FROM HotelReservationEntity r WHERE r.isDeleted = false " +
           "AND r.room.id = :roomId " +
           "AND r.status <> 'CANCELLED' " +
           "AND (:reservationId IS NULL OR r.id <> :reservationId) " +
           "AND ((r.checkInDate < :checkOutDate AND r.checkOutDate > :checkInDate))")
    boolean checkOverlappingReservations(
        @Param("roomId") Integer roomId,
        @Param("checkInDate") LocalDate checkInDate,
        @Param("checkOutDate") LocalDate checkOutDate,
        @Param("reservationId") Integer reservationId
    );

    @Query("SELECT r FROM HotelReservationEntity r WHERE r.isDeleted = false " +
           "AND (:customerId IS NULL OR r.customer.id = :customerId) " +
           "AND (:roomId IS NULL OR r.room.id = :roomId) " +
           "AND (:status IS NULL OR r.status = :status) " +
           "AND (:startDate IS NULL OR r.checkInDate >= :startDate) " +
           "AND (:endDate IS NULL OR r.checkOutDate <= :endDate)")
    Page<HotelReservationEntity> filterReservations(
        @Param("customerId") Integer customerId,
        @Param("roomId") Integer roomId,
        @Param("status") String status,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate,
        Pageable pageable
    );
}
