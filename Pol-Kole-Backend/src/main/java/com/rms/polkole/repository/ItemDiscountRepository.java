package com.rms.polkole.repository;

import com.rms.polkole.entity.ItemDiscountEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ItemDiscountRepository extends JpaRepository<ItemDiscountEntity, Integer> {
    @Query("SELECT d FROM ItemDiscountEntity d WHERE d.menuItem.id = :menuItemId AND d.isActive = true AND :today BETWEEN d.startDate AND d.endDate")
    List<ItemDiscountEntity> findActiveDiscountsForItem(@Param("menuItemId") Integer menuItemId, @Param("today") LocalDate today);

    @Query("SELECT d FROM ItemDiscountEntity d WHERE " +
           "(:search IS NULL OR :search = '' OR LOWER(d.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(d.menuItem.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<ItemDiscountEntity> searchItemDiscounts(@Param("search") String search, Pageable pageable);

    @Query("SELECT d FROM ItemDiscountEntity d WHERE d.isActive = true AND :today BETWEEN d.startDate AND d.endDate")
    List<ItemDiscountEntity> findAllActiveDiscounts(@Param("today") LocalDate today);
}
