package com.rms.polkole.repository;

import com.rms.polkole.entity.MenuItemEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MenuItemRepository extends JpaRepository<MenuItemEntity, Integer> {
    @Query("SELECT m FROM MenuItemEntity m WHERE m.isDeleted = false " +
           "AND (:categoryId IS NULL OR m.category.id = :categoryId) " +
           "AND (:isAvailable IS NULL OR m.isAvailable = :isAvailable) " +
           "AND (:search IS NULL OR LOWER(m.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(m.description) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<MenuItemEntity> filterMenuItems(
            @Param("categoryId") Integer categoryId,
            @Param("isAvailable") Boolean isAvailable,
            @Param("search") String search,
            Pageable pageable);
}
