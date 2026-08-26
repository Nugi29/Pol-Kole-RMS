package com.rms.polkole.repository;

import com.rms.polkole.entity.OrderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.Instant;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<OrderEntity, Integer> {
    @Query("SELECT o FROM OrderEntity o WHERE o.isDeleted = false " +
           "AND (:statusId IS NULL OR o.status.id = :statusId) " +
           "AND (:tableId IS NULL OR o.table.id = :tableId) " +
           "AND (:roomId IS NULL OR o.room.id = :roomId) " +
           "AND (:customerId IS NULL OR o.customer.id = :customerId) " +
           "AND (:startTime IS NULL OR o.orderTime >= :startTime) " +
           "AND (:endTime IS NULL OR o.orderTime <= :endTime)")
    Page<OrderEntity> filterOrders(
            @Param("statusId") Integer statusId,
            @Param("tableId") Integer tableId,
            @Param("roomId") Integer roomId,
            @Param("customerId") Integer customerId,
            @Param("startTime") Instant startTime,
            @Param("endTime") Instant endTime,
            Pageable pageable);

    @Query("SELECT o FROM OrderEntity o WHERE o.isDeleted = false AND o.status.name != 'COMPLETED' AND o.status.name != 'CANCELLED'")
    List<OrderEntity> findActiveOrders();

    @Query("SELECT o FROM OrderEntity o WHERE o.isDeleted = false " +
           "AND o.room.id = :roomId " +
           "AND o.status.name != 'COMPLETED' AND o.status.name != 'CANCELLED'")
    List<OrderEntity> findUnpaidOrdersByRoom(@Param("roomId") Integer roomId);

    @Query("SELECT o FROM OrderEntity o WHERE o.isDeleted = false " +
           "AND o.table.id = :tableId " +
           "AND o.status.name != 'COMPLETED' AND o.status.name != 'CANCELLED'")
    List<OrderEntity> findUnpaidOrdersByTable(@Param("tableId") Integer tableId);
}
