package com.rms.polkole.repository;

import com.rms.polkole.entity.RestaurantTableEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RestaurantTableRepository extends JpaRepository<RestaurantTableEntity, Integer> {
    Optional<RestaurantTableEntity> findByTableNumber(String tableNumber);

    @Query("SELECT t FROM RestaurantTableEntity t WHERE t.isDeleted = false " +
           "AND (:status IS NULL OR t.status = :status) " +
           "AND (:location IS NULL OR t.location = :location) " +
           "AND (:capacity IS NULL OR t.capacity >= :capacity) " +
           "AND (:search IS NULL OR LOWER(t.tableNumber) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<RestaurantTableEntity> filterTables(
            @Param("status") String status,
            @Param("location") String location,
            @Param("capacity") Integer capacity,
            @Param("search") String search,
            Pageable pageable);
}
