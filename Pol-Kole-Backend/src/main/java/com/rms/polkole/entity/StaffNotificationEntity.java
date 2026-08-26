package com.rms.polkole.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "staff_notifications")
public class StaffNotificationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "recipient_id", nullable = false)
    private UserEntity recipient;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sender_id")
    private UserEntity sender;

    @Column(name = "type", nullable = false, length = 50)
    private String type; // CALL_WAITER, NEW_ORDER, ORDER_READY, CUSTOMER_REQUEST, PAYMENT_REQUEST, NEW_KITCHEN_ORDER, WAITER_OFFLINE, UNASSIGNED_REQUEST, etc.

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "message", nullable = false, length = 500)
    private String message;

    @Column(name = "target_type", length = 30)
    private String targetType; // TABLE, ROOM, ORDER, KITCHEN, GENERAL

    @Column(name = "target_id")
    private Integer targetId;

    @Column(name = "target_label", length = 50)
    private String targetLabel;

    @Builder.Default
    @Column(name = "priority", nullable = false, length = 20)
    private String priority = "MEDIUM"; // LOW, MEDIUM, HIGH, URGENT

    @Builder.Default
    @Column(name = "status", nullable = false, length = 20)
    private String status = "UNREAD"; // UNREAD, READ, RESOLVED, DISMISSED

    @Builder.Default
    @Column(name = "is_fallback", nullable = false)
    private boolean isFallback = false;

    @Column(name = "fallback_note", length = 255)
    private String fallbackNote;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (status == null) status = "UNREAD";
        if (priority == null) priority = "MEDIUM";
    }
}
