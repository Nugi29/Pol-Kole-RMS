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

    /**
     * Bulk-resolve all unresolved notifications that match the given target in a single
     * database operation, then broadcast a resolution event so connected clients update
     * without waiting for the next poll cycle.
     *
     * @param targetType  e.g. "TABLE" or "ROOM" (nullable — matches any type when null)
     * @param targetLabel the human-readable location, e.g. "Table 5" or "101"
     * @param targetId    the numeric location ID (nullable — used as secondary match)
     * @return number of notification rows resolved
     */
    int resolveByTarget(String targetType, String targetLabel, Integer targetId);
}
