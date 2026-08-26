package com.rms.polkole.dto;

import lombok.*;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ActiveStaffSummaryDto {
    private LocalDate date;
    private int totalStaff;
    private int presentCount;
    private int lateCount;
    private int absentCount;
    private int onLeaveCount;
    private List<AttendanceDto> activeWaiters;
    private List<AttendanceDto> activeChefs;
    private List<AttendanceDto> otherStaff;
}
