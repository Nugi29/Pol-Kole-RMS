package com.rms.polkole.service;

import com.rms.polkole.dto.ActiveStaffSummaryDto;
import com.rms.polkole.dto.AttendanceDto;
import java.time.LocalDate;
import java.util.List;

public interface AttendanceService {
    AttendanceDto markAttendance(AttendanceDto dto);
    AttendanceDto checkIn(Integer userId);
    AttendanceDto checkOut(Integer userId);
    List<AttendanceDto> getAttendanceByDate(LocalDate date);
    List<AttendanceDto> getAttendanceHistory(LocalDate startDate, LocalDate endDate);
    List<AttendanceDto> getUserAttendanceHistory(Integer userId);
    ActiveStaffSummaryDto getActiveStaffSummary(LocalDate date);
    List<AttendanceDto> getActiveStaffByRole(LocalDate date, String roleName);
}
