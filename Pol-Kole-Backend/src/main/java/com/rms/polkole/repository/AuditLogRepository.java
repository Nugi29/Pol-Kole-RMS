package com.rms.polkole.repository;

import com.rms.polkole.entity.AuditLogEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Integer> {
    Page<AuditLogEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
