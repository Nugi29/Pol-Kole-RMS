package com.rms.polkole.dto;

import lombok.*;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyStaffAssignmentDto {
    private Long id;
    private LocalDate assignmentDate;
    private Integer userId;
    private String userName;
    private String userEmail;
    private String roleType; // WAITER, CHEF
    private String assignmentType; // TABLE, ROOM, TAKEAWAY_ZONE, KITCHEN_STATION
    private Integer tableId;
    private String tableNumber;
    private String tableLocation;
    private Integer roomId;
    private String roomNumber;
    private String roomType;
    private String zoneOrStation;
    private boolean isActive;
    private String notes;
    private String onlineStatus;
    private Instant lastSeen;
}
