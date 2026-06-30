package com.rms.polkole.repository;

import com.rms.polkole.entity.ReservationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<ReservationEntity, Integer> {
    List<ReservationEntity> findByCustomerId(Integer customerId);

    @Query("SELECT COUNT(r) > 0 FROM ReservationEntity r WHERE r.isDeleted = false " +
           "AND r.table.id = :tableId " +
           "AND r.reservationStatus.statusName <> 'CANCELLED' " +
           "AND (:reservationId IS NULL OR r.id <> :reservationId) " +
           "AND r.reservationDate = :reservationDate " +
           "AND r.reservationTime = :reservationTime")
    boolean checkOverlappingReservations(
        @Param("tableId") Integer tableId,
        @Param("reservationDate") LocalDate reservationDate,
        @Param("reservationTime") String reservationTime,
        @Param("reservationId") Integer reservationId
    );

    @Query("SELECT r FROM ReservationEntity r WHERE r.isDeleted = false " +
           "AND (:customerId IS NULL OR r.customer.id = :customerId) " +
           "AND (:tableId IS NULL OR r.table.id = :tableId) " +
           "AND (:statusId IS NULL OR r.reservationStatus.id = :statusId) " +
           "AND (:startDate IS NULL OR r.reservationDate >= :startDate) " +
           "AND (:endDate IS NULL OR r.reservationDate <= :endDate)")
    Page<ReservationEntity> filterReservations(
        @Param("customerId") Integer customerId,
        @Param("tableId") Integer tableId,
        @Param("statusId") Integer statusId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate,
        Pageable pageable
    );

    List<ReservationEntity> findByReservationDate(LocalDate reservationDate);
}
