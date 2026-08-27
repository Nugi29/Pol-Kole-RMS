package com.rms.polkole.repository;

import com.rms.polkole.entity.StaffNotificationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface StaffNotificationRepository extends JpaRepository<StaffNotificationEntity, Long> {
    List<StaffNotificationEntity> findByRecipientIdOrderByCreatedAtDesc(Integer recipientId);

    Page<StaffNotificationEntity> findByRecipientIdOrderByCreatedAtDesc(Integer recipientId, Pageable pageable);

    List<StaffNotificationEntity> findByRecipientIdAndStatusOrderByCreatedAtDesc(Integer recipientId, String status);

    long countByRecipientIdAndStatus(Integer recipientId, String status);

    List<StaffNotificationEntity> findTop50ByOrderByCreatedAtDesc();

    /**
     * Find all active (non-resolved/non-dismissed) notifications matching a target label,
     * optionally filtered by targetType. Used for bulk resolution across all users.
     */
    @Query("SELECT n FROM StaffNotificationEntity n " +
           "WHERE LOWER(n.targetLabel) = LOWER(:targetLabel) " +
           "AND n.status NOT IN ('RESOLVED', 'DISMISSED') " +
           "AND (:targetType IS NULL OR UPPER(n.targetType) = UPPER(:targetType))")
    List<StaffNotificationEntity> findActiveByTargetLabel(
            @Param("targetLabel") String targetLabel,
            @Param("targetType") String targetType);

    /**
     * Find all active notifications matching a target ID, optionally filtered by targetType.
     */
    @Query("SELECT n FROM StaffNotificationEntity n " +
           "WHERE n.targetId = :targetId " +
           "AND n.status NOT IN ('RESOLVED', 'DISMISSED') " +
           "AND (:targetType IS NULL OR UPPER(n.targetType) = UPPER(:targetType))")
    List<StaffNotificationEntity> findActiveByTargetId(
            @Param("targetId") Integer targetId,
            @Param("targetType") String targetType);

    /**
     * Bulk-resolve all active notifications for a target label in one UPDATE query.
     * Returns the count of rows updated.
     */
    @Modifying
    @Query("UPDATE StaffNotificationEntity n SET n.status = 'RESOLVED', n.resolvedAt = :now " +
           "WHERE LOWER(n.targetLabel) = LOWER(:targetLabel) " +
           "AND n.status NOT IN ('RESOLVED', 'DISMISSED') " +
           "AND (:targetType IS NULL OR UPPER(n.targetType) = UPPER(:targetType))")
    int bulkResolveByTargetLabel(
            @Param("targetLabel") String targetLabel,
            @Param("targetType") String targetType,
            @Param("now") Instant now);

    /**
     * Bulk-resolve all active notifications for a target ID in one UPDATE query.
     */
    @Modifying
    @Query("UPDATE StaffNotificationEntity n SET n.status = 'RESOLVED', n.resolvedAt = :now " +
           "WHERE n.targetId = :targetId " +
           "AND n.status NOT IN ('RESOLVED', 'DISMISSED') " +
           "AND (:targetType IS NULL OR UPPER(n.targetType) = UPPER(:targetType))")
    int bulkResolveByTargetId(
            @Param("targetId") Integer targetId,
            @Param("targetType") String targetType,
            @Param("now") Instant now);
}
