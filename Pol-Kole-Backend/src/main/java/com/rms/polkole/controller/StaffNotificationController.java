package com.rms.polkole.controller;

import com.rms.polkole.dto.StaffNotificationDto;
import com.rms.polkole.service.StaffNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    /**
     * Bulk-resolve all unresolved notifications matching a target location in one DB operation.
     * Replaces the N+1 client-side loop that previously fetched every user's notifications
     * individually before resolving them one-by-one.
     *
     * Expected body: { "targetType": "TABLE", "targetLabel": "Table 5", "targetId": 3 }
     * Returns: { "resolvedCount": N }
     */
    @PutMapping("/resolve-by-target")
    public ResponseEntity<Map<String, Integer>> resolveByTarget(@RequestBody Map<String, Object> body) {
        String targetType  = body.get("targetType")  != null ? String.valueOf(body.get("targetType"))  : null;
        String targetLabel = body.get("targetLabel") != null ? String.valueOf(body.get("targetLabel")) : null;
        Integer targetId   = body.get("targetId")    != null ? Integer.valueOf(String.valueOf(body.get("targetId"))) : null;

        int count = notificationService.resolveByTarget(targetType, targetLabel, targetId);
        return ResponseEntity.ok(Map.of("resolvedCount", count));
    }
}
