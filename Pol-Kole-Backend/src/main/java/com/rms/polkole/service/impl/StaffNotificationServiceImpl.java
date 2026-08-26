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
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class StaffNotificationServiceImpl implements StaffNotificationService {

    private final StaffNotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    @Transactional
    public StaffNotificationDto sendTargetedNotification(StaffNotificationDto dto) {
        if (dto.getRecipientId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Recipient ID is required for targeted notification.");
        }

        UserEntity recipient = userRepository.findById(dto.getRecipientId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recipient user not found with ID: " + dto.getRecipientId()));

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

        // Real-time broadcast to the specific staff member's destination
        try {
            messagingTemplate.convertAndSend("/topic/staff/" + recipient.getId(), result);
            messagingTemplate.convertAndSend("/topic/guest-calls", result);
        } catch (Exception e) {
            log.warn("Failed to push STOMP message for staff {}: {}", recipient.getId(), e.getMessage());
        }

        return result;
    }

    @Override
    @Transactional
    public void broadcastToRole(String roleName, StaffNotificationDto dto) {
        List<UserEntity> staffWithRole = userRepository.findByRoleNameIgnoreCase(roleName);
        for (UserEntity u : staffWithRole) {
            dto.setRecipientId(u.getId());
            dto.setRecipientName(u.getName());
            sendTargetedNotification(dto);
        }

        try {
            messagingTemplate.convertAndSend("/topic/role/" + roleName.toUpperCase(), dto);
        } catch (Exception e) {
            log.warn("Failed to push STOMP message for role {}: {}", roleName, e.getMessage());
        }
    }

    @Override
    public void broadcastToTopic(String topic, Object payload) {
        try {
            messagingTemplate.convertAndSend(topic, payload);
        } catch (Exception e) {
            log.warn("Failed to broadcast to topic {}: {}", topic, e.getMessage());
        }
    }

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
    @Transactional
    public StaffNotificationDto markAsRead(Long notificationId) {
        StaffNotificationEntity entity = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found with ID: " + notificationId));
        entity.setStatus("READ");
        entity = notificationRepository.save(entity);
        return mapToDto(entity);
    }

    @Override
    @Transactional
    public StaffNotificationDto resolveNotification(Long notificationId) {
        StaffNotificationEntity entity = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found with ID: " + notificationId));
        entity.setStatus("RESOLVED");
        entity.setResolvedAt(Instant.now());
        entity = notificationRepository.save(entity);
        return mapToDto(entity);
    }

    @Override
    @Transactional
    public void markAllAsRead(Integer userId) {
        List<StaffNotificationEntity> unread = notificationRepository.findByRecipientIdAndStatusOrderByCreatedAtDesc(userId, "UNREAD");
        for (StaffNotificationEntity n : unread) {
            n.setStatus("READ");
        }
        notificationRepository.saveAll(unread);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Integer userId) {
        return notificationRepository.countByRecipientIdAndStatus(userId, "UNREAD");
    }

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
