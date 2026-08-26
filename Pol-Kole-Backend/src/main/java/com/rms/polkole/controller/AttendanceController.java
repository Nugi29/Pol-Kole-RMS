package com.rms.polkole.controller;

import com.rms.polkole.dto.ActiveStaffSummaryDto;
import com.rms.polkole.dto.AttendanceDto;
import com.rms.polkole.service.AttendanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/attendance")
@RequiredArgsConstructor
@CrossOrigin
public class AttendanceController {

    private final AttendanceService attendanceService;

    @PostMapping("/mark")
    public ResponseEntity<AttendanceDto> markAttendance(@RequestBody AttendanceDto dto) {
        return ResponseEntity.ok(attendanceService.markAttendance(dto));
    }

    @PostMapping("/check-in/{userId}")
    public ResponseEntity<AttendanceDto> checkIn(@PathVariable Integer userId) {
        return ResponseEntity.ok(attendanceService.checkIn(userId));
    }

    @PostMapping("/check-out/{userId}")
    public ResponseEntity<AttendanceDto> checkOut(@PathVariable Integer userId) {
        return ResponseEntity.ok(attendanceService.checkOut(userId));
    }

    @GetMapping("/date")
    public ResponseEntity<List<AttendanceDto>> getAttendanceByDate(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(attendanceService.getAttendanceByDate(date));
    }

    @GetMapping("/history")
    public ResponseEntity<List<AttendanceDto>> getAttendanceHistory(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(attendanceService.getAttendanceHistory(startDate, endDate));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<AttendanceDto>> getUserAttendanceHistory(@PathVariable Integer userId) {
        return ResponseEntity.ok(attendanceService.getUserAttendanceHistory(userId));
    }

    @GetMapping("/summary")
    public ResponseEntity<ActiveStaffSummaryDto> getActiveStaffSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(attendanceService.getActiveStaffSummary(date));
    }

    @GetMapping("/active-role")
    public ResponseEntity<List<AttendanceDto>> getActiveStaffByRole(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String role) {
        return ResponseEntity.ok(attendanceService.getActiveStaffByRole(date, role));
    }
}
