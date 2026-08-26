package com.rms.polkole.dto;

import lombok.*;
import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffNotificationDto {
    private Long id;
    private Integer recipientId;
    private String recipientName;
    private Integer senderId;
    private String senderName;
    private String type;
    private String title;
    private String message;
    private String targetType;
    private Integer targetId;
    private String targetLabel;
    private String priority;
    private String status;
    private boolean isFallback;
    private String fallbackNote;
    private Instant createdAt;
    private Instant resolvedAt;
}
