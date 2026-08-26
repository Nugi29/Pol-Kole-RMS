package com.rms.polkole.repository;

import com.rms.polkole.entity.StaffNotificationEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StaffNotificationRepository extends JpaRepository<StaffNotificationEntity, Long> {
    List<StaffNotificationEntity> findByRecipientIdOrderByCreatedAtDesc(Integer recipientId);

    Page<StaffNotificationEntity> findByRecipientIdOrderByCreatedAtDesc(Integer recipientId, Pageable pageable);

    List<StaffNotificationEntity> findByRecipientIdAndStatusOrderByCreatedAtDesc(Integer recipientId, String status);

    long countByRecipientIdAndStatus(Integer recipientId, String status);

    List<StaffNotificationEntity> findTop50ByOrderByCreatedAtDesc();
}
