package com.rms.polkole.service.impl;

import com.rms.polkole.dto.ActiveStaffSummaryDto;
import com.rms.polkole.dto.AttendanceDto;
import com.rms.polkole.entity.AttendanceEntity;
import com.rms.polkole.entity.AttendanceStatus;
import com.rms.polkole.entity.UserEntity;
import com.rms.polkole.repository.AttendanceRepository;
import com.rms.polkole.repository.UserRepository;
import com.rms.polkole.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AttendanceServiceImpl implements AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public AttendanceDto markAttendance(AttendanceDto dto) {
        if (dto.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User ID is required");
        }

        UserEntity user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with ID: " + dto.getUserId()));

        LocalDate date = dto.getAttendanceDate() != null ? dto.getAttendanceDate() : LocalDate.now();

        AttendanceEntity attendance = attendanceRepository.findByUserIdAndAttendanceDate(user.getId(), date)
                .orElse(AttendanceEntity.builder()
                        .user(user)
                        .attendanceDate(date)
                        .build());

        attendance.setStatus(dto.getStatus() != null ? dto.getStatus() : AttendanceStatus.PRESENT);
        if (dto.getCheckInTime() != null) attendance.setCheckInTime(dto.getCheckInTime());
        if (dto.getCheckOutTime() != null) attendance.setCheckOutTime(dto.getCheckOutTime());
        if (dto.getNotes() != null) attendance.setNotes(dto.getNotes());

        if (attendance.getCheckInTime() == null && (attendance.getStatus() == AttendanceStatus.PRESENT || attendance.getStatus() == AttendanceStatus.LATE)) {
            attendance.setCheckInTime(LocalTime.now());
        }

        attendance = attendanceRepository.save(attendance);
        return mapToDto(attendance);
    }

    @Override
    @Transactional
    public AttendanceDto checkIn(Integer userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with ID: " + userId));

        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        AttendanceEntity attendance = attendanceRepository.findByUserIdAndAttendanceDate(user.getId(), today)
                .orElse(AttendanceEntity.builder()
                        .user(user)
                        .attendanceDate(today)
                        .build());

        attendance.setCheckInTime(now);
        // If checking in after 09:30 AM, mark as LATE unless already set
        if (now.isAfter(LocalTime.of(9, 30)) && attendance.getStatus() != AttendanceStatus.ON_LEAVE) {
            attendance.setStatus(AttendanceStatus.LATE);
        } else if (attendance.getStatus() == null || attendance.getStatus() == AttendanceStatus.ABSENT) {
            attendance.setStatus(AttendanceStatus.PRESENT);
        }

        attendance = attendanceRepository.save(attendance);
        return mapToDto(attendance);
    }

    @Override
    @Transactional
    public AttendanceDto checkOut(Integer userId) {
        LocalDate today = LocalDate.now();
        AttendanceEntity attendance = attendanceRepository.findByUserIdAndAttendanceDate(userId, today)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No attendance record found for user today to check out."));

        attendance.setCheckOutTime(LocalTime.now());
        attendance = attendanceRepository.save(attendance);
        return mapToDto(attendance);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceDto> getAttendanceByDate(LocalDate date) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        List<AttendanceEntity> recorded = attendanceRepository.findByAttendanceDate(queryDate);
        Map<Integer, AttendanceEntity> recordMap = recorded.stream()
                .collect(Collectors.toMap(a -> a.getUser().getId(), a -> a, (k1, k2) -> k1));

        List<UserEntity> allUsers = userRepository.findAll();
        List<AttendanceDto> result = new ArrayList<>();

        for (UserEntity u : allUsers) {
            if (recordMap.containsKey(u.getId())) {
                result.add(mapToDto(recordMap.get(u.getId())));
            } else {
                // If it's today or past and not recorded, default to ABSENT placeholder
                result.add(AttendanceDto.builder()
                        .userId(u.getId())
                        .userName(u.getName())
                        .userEmail(u.getEmail())
                        .roleName(u.getRole() != null ? u.getRole().getName() : "Staff")
                        .attendanceDate(queryDate)
                        .status(AttendanceStatus.ABSENT)
                        .onlineStatus(u.getOnlineStatus() != null ? u.getOnlineStatus() : "OFFLINE")
                        .lastSeen(u.getLastSeen())
                        .build());
            }
        }

        return result;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceDto> getAttendanceHistory(LocalDate startDate, LocalDate endDate) {
        LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        LocalDate end = endDate != null ? endDate : LocalDate.now();
        return attendanceRepository.findByAttendanceDateBetweenOrderByAttendanceDateDesc(start, end).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceDto> getUserAttendanceHistory(Integer userId) {
        return attendanceRepository.findByUserIdOrderByAttendanceDateDesc(userId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ActiveStaffSummaryDto getActiveStaffSummary(LocalDate date) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        List<AttendanceDto> all = getAttendanceByDate(queryDate);

        List<AttendanceDto> activeWaiters = new ArrayList<>();
        List<AttendanceDto> activeChefs = new ArrayList<>();
        List<AttendanceDto> otherStaff = new ArrayList<>();

        int presentCount = 0;
        int lateCount = 0;
        int absentCount = 0;
        int onLeaveCount = 0;

        for (AttendanceDto a : all) {
            if (a.getStatus() == AttendanceStatus.PRESENT) presentCount++;
            else if (a.getStatus() == AttendanceStatus.LATE) lateCount++;
            else if (a.getStatus() == AttendanceStatus.ABSENT) absentCount++;
            else if (a.getStatus() == AttendanceStatus.ON_LEAVE) onLeaveCount++;

            boolean isActive = (a.getStatus() == AttendanceStatus.PRESENT || a.getStatus() == AttendanceStatus.LATE);
            String role = a.getRoleName() != null ? a.getRoleName().toUpperCase() : "";

            if (role.contains("WAITER")) {
                if (isActive) activeWaiters.add(a);
            } else if (role.contains("CHEF") || role.contains("COOK")) {
                if (isActive) activeChefs.add(a);
            } else {
                otherStaff.add(a);
            }
        }

        return ActiveStaffSummaryDto.builder()
                .date(queryDate)
                .totalStaff(all.size())
                .presentCount(presentCount)
                .lateCount(lateCount)
                .absentCount(absentCount)
                .onLeaveCount(onLeaveCount)
                .activeWaiters(activeWaiters)
                .activeChefs(activeChefs)
                .otherStaff(otherStaff)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AttendanceDto> getActiveStaffByRole(LocalDate date, String roleName) {
        LocalDate queryDate = date != null ? date : LocalDate.now();
        List<AttendanceStatus> activeStatuses = List.of(AttendanceStatus.PRESENT, AttendanceStatus.LATE);
        return attendanceRepository.findActiveStaffByDateAndRole(queryDate, roleName, activeStatuses).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private AttendanceDto mapToDto(AttendanceEntity entity) {
        UserEntity u = entity.getUser();
        return AttendanceDto.builder()
                .id(entity.getId())
                .userId(u != null ? u.getId() : null)
                .userName(u != null ? u.getName() : null)
                .userEmail(u != null ? u.getEmail() : null)
                .roleName(u != null && u.getRole() != null ? u.getRole().getName() : null)
                .attendanceDate(entity.getAttendanceDate())
                .checkInTime(entity.getCheckInTime())
                .checkOutTime(entity.getCheckOutTime())
                .status(entity.getStatus())
                .notes(entity.getNotes())
                .onlineStatus(u != null && u.getOnlineStatus() != null ? u.getOnlineStatus() : "OFFLINE")
                .lastSeen(u != null ? u.getLastSeen() : null)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
