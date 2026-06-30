package com.rms.polkole.service;

import com.rms.polkole.entity.AuditLogEntity;
import org.springframework.data.domain.Page;

public interface AuditLogService {
    void log(String action, String details);
    Page<AuditLogEntity> getAuditLogs(int page, int size);
}
