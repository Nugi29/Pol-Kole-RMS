package com.rms.polkole.service.impl;

import com.rms.polkole.dto.StaffNotificationDto;
import com.rms.polkole.entity.StaffNotificationEntity;
import com.rms.polkole.entity.UserEntity;
import com.rms.polkole.repository.StaffNotificationRepository;
import com.rms.polkole.repository.UserRepository;
import com.rms.polkole.service.StaffNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StaffNotificationServiceImpl implements StaffNotificationService {

    private final StaffNotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // -----------------------------------------------------------------------
    // Send / Broadcast
    // -----------------------------------------------------------------------

    @Override
    @Transactional
    public StaffNotificationDto sendTargetedNotification(StaffNotificationDto dto) {
        if (dto.getRecipientId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Recipient ID is required for targeted notification.");
        }

        UserEntity recipient = userRepository.findById(dto.getRecipientId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Recipient user not found with ID: " + dto.getRecipientId()));

        UserEntity sender = null;
        if (dto.getSenderId() != null) {
            sender = userRepository.findById(dto.getSenderId()).orElse(null);
        }

        StaffNotificationEntity entity = StaffNotificationEntity.builder()
                .recipient(recipient)
                .sender(sender)
                .type(dto.getType() != null ? dto.getType() : "CALL_WAITER")
                .title(dto.getTitle() != null ? dto.getTitle() : "Customer Request")
                .message(dto.getMessage() != null ? dto.getMessage() : "Customer needs assistance")
                .targetType(dto.getTargetType())
                .targetId(dto.getTargetId())
                .targetLabel(dto.getTargetLabel())
                .priority(dto.getPriority() != null ? dto.getPriority() : "MEDIUM")
                .status("UNREAD")
                .isFallback(dto.isFallback())
                .fallbackNote(dto.getFallbackNote())
                .createdAt(Instant.now())
                .build();

        entity = notificationRepository.save(entity);
        StaffNotificationDto result = mapToDto(entity);

        // Push only to the specific staff member's personal topic — NOT to /topic/guest-calls.
        // Callers that want a shared broadcast (broadcastToRole, broadcastToTopic) will
        // send to /topic/guest-calls themselves, preventing duplicate messages.
        try {
            messagingTemplate.convertAndSend("/topic/staff/" + recipient.getId(), result);
        } catch (Exception e) {
            log.warn("[Notification] Failed to push STOMP to staff/{}: {}", recipient.getId(), e.getMessage());
        }

        return result;
    }

    @Override
    @Transactional
    public void broadcastToRole(String roleName, StaffNotificationDto dto) {
        List<UserEntity> staffWithRole = userRepository.findByRoleNameIgnoreCase(roleName);
        StaffNotificationDto lastSaved = dto;

        for (UserEntity u : staffWithRole) {
            StaffNotificationDto perUser = StaffNotificationDto.builder()
                    .recipientId(u.getId())
                    .recipientName(u.getName())
                    .senderId(dto.getSenderId())
                    .senderName(dto.getSenderName())
                    .type(dto.getType())
                    .title(dto.getTitle())
                    .message(dto.getMessage())
                    .targetType(dto.getTargetType())
                    .targetId(dto.getTargetId())
                    .targetLabel(dto.getTargetLabel())
                    .priority(dto.getPriority())
                    .isFallback(dto.isFallback())
                    .fallbackNote(dto.getFallbackNote())
                    .build();
            lastSaved = sendTargetedNotification(perUser);
        }

        // Single shared broadcast so all clients monitoring /topic/guest-calls get one update,
        // regardless of how many staff members belong to this role.
        try {
            messagingTemplate.convertAndSend("/topic/guest-calls", lastSaved);
            messagingTemplate.convertAndSend("/topic/role/" + roleName.toUpperCase(), lastSaved);
        } catch (Exception e) {
            log.warn("[Notification] Failed to broadcast to role {}: {}", roleName, e.getMessage());
        }
    }

    @Override
    public void broadcastToTopic(String topic, Object payload) {
        try {
            messagingTemplate.convertAndSend(topic, payload);
        } catch (Exception e) {
            log.warn("[Notification] Failed to broadcast to topic {}: {}", topic, e.getMessage());
        }
    }

    // -----------------------------------------------------------------------
    // Read
    // -----------------------------------------------------------------------

    @Override
    @Transactional(readOnly = true)
    public List<StaffNotificationDto> getNotificationsForUser(Integer userId, boolean unreadOnly) {
        List<StaffNotificationEntity> list;
        if (unreadOnly) {
            list = notificationRepository.findByRecipientIdAndStatusOrderByCreatedAtDesc(userId, "UNREAD");
        } else {
            list = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId);
        }
        return list.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StaffNotificationDto> getNotificationsForUserPaged(Integer userId, Pageable pageable) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId, pageable).map(this::mapToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Integer userId) {
        return notificationRepository.countByRecipientIdAndStatus(userId, "UNREAD");
    }

    // -----------------------------------------------------------------------
    // Status mutations
    // -----------------------------------------------------------------------

    @Override
    @Transactional
    public StaffNotificationDto markAsRead(Long notificationId) {
        StaffNotificationEntity entity = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Notification not found with ID: " + notificationId));
        if (!"RESOLVED".equals(entity.getStatus()) && !"DISMISSED".equals(entity.getStatus())) {
            entity.setStatus("READ");
            entity = notificationRepository.save(entity);
        }
        return mapToDto(entity);
    }

    @Override
    @Transactional
    public StaffNotificationDto resolveNotification(Long notificationId) {
        StaffNotificationEntity entity = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Notification not found with ID: " + notificationId));
        entity.setStatus("RESOLVED");
        entity.setResolvedAt(Instant.now());
        entity = notificationRepository.save(entity);
        StaffNotificationDto result = mapToDto(entity);

        // Real-time push: tell all connected clients this notification is gone so they
        // don't have to wait for the next 3-second polling cycle.
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("type", "NOTIFICATION_RESOLVED");
            event.put("notificationId", result.getId());
            event.put("targetType", result.getTargetType());
            event.put("targetLabel", result.getTargetLabel());
            event.put("targetId", result.getTargetId());
            messagingTemplate.convertAndSend("/topic/guest-calls", (Object) event);
        } catch (Exception e) {
            log.warn("[Notification] Failed to broadcast resolve event for ID {}: {}", notificationId, e.getMessage());
        }

        return result;
    }

    @Override
    @Transactional
    public void markAllAsRead(Integer userId) {
        List<StaffNotificationEntity> unread =
                notificationRepository.findByRecipientIdAndStatusOrderByCreatedAtDesc(userId, "UNREAD");
        for (StaffNotificationEntity n : unread) {
            n.setStatus("READ");
        }
        notificationRepository.saveAll(unread);
    }

    // -----------------------------------------------------------------------
    // Bulk resolve by target — replaces the N+1 frontend loop
    // -----------------------------------------------------------------------

    @Override
    @Transactional
    public int resolveByTarget(String targetType, String targetLabel, Integer targetId) {
        if (targetLabel == null && targetId == null) {
            log.warn("[Notification] resolveByTarget called with no targetLabel or targetId — skipped.");
            return 0;
        }

        Instant now = Instant.now();
        int resolved = 0;

        if (targetLabel != null && !targetLabel.isBlank()) {
            resolved += notificationRepository.bulkResolveByTargetLabel(targetLabel, targetType, now);
        }
        if (targetId != null && resolved == 0) {
            // Only fall back to ID-based resolution if label matched nothing
            resolved += notificationRepository.bulkResolveByTargetId(targetId, targetType, now);
        }

        if (resolved > 0) {
            log.info("[Notification] Bulk-resolved {} notification(s) for target type={} label={} id={}",
                    resolved, targetType, targetLabel, targetId);

            // Broadcast resolution event so all connected clients remove these cards immediately
            try {
                Map<String, Object> event = new HashMap<>();
                event.put("type", "NOTIFICATION_RESOLVED");
                event.put("targetType", targetType);
                event.put("targetLabel", targetLabel);
                event.put("targetId", targetId);
                event.put("resolvedCount", resolved);
                messagingTemplate.convertAndSend("/topic/guest-calls", (Object) event);
            } catch (Exception e) {
                log.warn("[Notification] Failed to broadcast bulk-resolve event: {}", e.getMessage());
            }
        }

        return resolved;
    }

    // -----------------------------------------------------------------------
    // Mapping
    // -----------------------------------------------------------------------

    private StaffNotificationDto mapToDto(StaffNotificationEntity entity) {
        return StaffNotificationDto.builder()
                .id(entity.getId())
                .recipientId(entity.getRecipient() != null ? entity.getRecipient().getId() : null)
                .recipientName(entity.getRecipient() != null ? entity.getRecipient().getName() : null)
                .senderId(entity.getSender() != null ? entity.getSender().getId() : null)
                .senderName(entity.getSender() != null ? entity.getSender().getName() : null)
                .type(entity.getType())
                .title(entity.getTitle())
                .message(entity.getMessage())
                .targetType(entity.getTargetType())
                .targetId(entity.getTargetId())
                .targetLabel(entity.getTargetLabel())
                .priority(entity.getPriority())
                .status(entity.getStatus())
                .isFallback(entity.isFallback())
                .fallbackNote(entity.getFallbackNote())
                .createdAt(entity.getCreatedAt())
                .resolvedAt(entity.getResolvedAt())
                .build();
    }
}

