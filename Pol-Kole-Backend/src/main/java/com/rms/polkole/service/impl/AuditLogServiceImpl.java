package com.rms.polkole.service.impl;

import com.rms.polkole.entity.AuditLogEntity;
import com.rms.polkole.repository.AuditLogRepository;
import com.rms.polkole.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional
    public void log(String action, String details) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = "SYSTEM";
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getPrincipal())) {
            username = authentication.getName();
        }

        AuditLogEntity log = AuditLogEntity.builder()
                .action(action)
                .details(details)
                .performedBy(username)
                .build();

        auditLogRepository.save(log);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogEntity> getAuditLogs(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }
}
