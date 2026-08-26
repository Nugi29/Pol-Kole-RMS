package com.rms.polkole.dto;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CallWaiterResponseDto {
    private boolean success;
    private String message;
    private Integer assignedStaffId;
    private String assignedStaffName;
    private String assignedStaffRole;
    private boolean isFallback;
    private String fallbackReason;
    private Long notificationId;
}
