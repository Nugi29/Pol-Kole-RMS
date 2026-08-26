package com.rms.polkole.controller;

import com.rms.polkole.dto.StaffNotificationDto;
import com.rms.polkole.service.StaffNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/staff-notifications")
@RequiredArgsConstructor
@CrossOrigin
public class StaffNotificationController {

    private final StaffNotificationService notificationService;

    @PostMapping("/send")
    public ResponseEntity<StaffNotificationDto> sendNotification(@RequestBody StaffNotificationDto dto) {
        return ResponseEntity.ok(notificationService.sendTargetedNotification(dto));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<StaffNotificationDto>> getUserNotifications(
            @PathVariable Integer userId,
            @RequestParam(defaultValue = "false") boolean unreadOnly) {
        return ResponseEntity.ok(notificationService.getNotificationsForUser(userId, unreadOnly));
    }

    @GetMapping("/user/{userId}/unread-count")
    public ResponseEntity<Long> getUnreadCount(@PathVariable Integer userId) {
        return ResponseEntity.ok(notificationService.getUnreadCount(userId));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<StaffNotificationDto> markAsRead(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.markAsRead(id));
    }

    @PutMapping("/{id}/resolve")
    public ResponseEntity<StaffNotificationDto> resolveNotification(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.resolveNotification(id));
    }

    @PutMapping("/user/{userId}/read-all")
    public ResponseEntity<Void> markAllAsRead(@PathVariable Integer userId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }
}
