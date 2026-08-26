package com.rms.polkole.dto;

import com.rms.polkole.entity.AttendanceStatus;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceDto {
    private Long id;
    private Integer userId;
    private String userName;
    private String userEmail;
    private String roleName;
    private LocalDate attendanceDate;
    private LocalTime checkInTime;
    private LocalTime checkOutTime;
    private AttendanceStatus status;
    private String notes;
    private String onlineStatus;
    private Instant lastSeen;
    private Instant createdAt;
    private Instant updatedAt;
}
