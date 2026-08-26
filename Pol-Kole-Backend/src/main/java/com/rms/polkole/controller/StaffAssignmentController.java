package com.rms.polkole.controller;

import com.rms.polkole.dto.CallWaiterRequestDto;
import com.rms.polkole.dto.CallWaiterResponseDto;
import com.rms.polkole.dto.DailyStaffAssignmentDto;
import com.rms.polkole.service.StaffAssignmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/staff-assignments")
@RequiredArgsConstructor
@CrossOrigin
public class StaffAssignmentController {

    private final StaffAssignmentService assignmentService;

    @GetMapping
    public ResponseEntity<List<DailyStaffAssignmentDto>> getDailyAssignments(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(assignmentService.getDailyAssignments(date));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<DailyStaffAssignmentDto>> getAssignmentsForUser(
            @PathVariable Integer userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(assignmentService.getAssignmentsForUser(date, userId));
    }

    @PostMapping("/auto-assign/waiters")
    public ResponseEntity<List<DailyStaffAssignmentDto>> autoAssignWaiters(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(assignmentService.autoAssignActiveWaiters(date));
    }

    @PostMapping("/auto-assign/chefs")
    public ResponseEntity<List<DailyStaffAssignmentDto>> autoAssignChefs(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(assignmentService.autoAssignActiveChefs(date));
    }

    @PostMapping("/custom")
    public ResponseEntity<List<DailyStaffAssignmentDto>> saveCustomAssignments(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestBody List<DailyStaffAssignmentDto> assignments) {
        return ResponseEntity.ok(assignmentService.saveCustomAssignments(date, assignments));
    }

    @PostMapping("/call-waiter")
    public ResponseEntity<CallWaiterResponseDto> callWaiter(@RequestBody CallWaiterRequestDto request) {
        return ResponseEntity.ok(assignmentService.handleCallWaiterRequest(request));
    }
}
