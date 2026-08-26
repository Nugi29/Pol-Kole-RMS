package com.rms.polkole.service;

import com.rms.polkole.dto.StaffNotificationDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface StaffNotificationService {
    StaffNotificationDto sendTargetedNotification(StaffNotificationDto dto);
    void broadcastToRole(String roleName, StaffNotificationDto dto);
    void broadcastToTopic(String topic, Object payload);
    List<StaffNotificationDto> getNotificationsForUser(Integer userId, boolean unreadOnly);
    Page<StaffNotificationDto> getNotificationsForUserPaged(Integer userId, Pageable pageable);
    StaffNotificationDto markAsRead(Long notificationId);
    StaffNotificationDto resolveNotification(Long notificationId);
    void markAllAsRead(Integer userId);
    long getUnreadCount(Integer userId);
}
