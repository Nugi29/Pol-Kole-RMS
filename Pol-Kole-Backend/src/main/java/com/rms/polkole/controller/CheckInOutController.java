package com.rms.polkole.controller;

import com.rms.polkole.dto.ApiResponse;
import com.rms.polkole.dto.CheckInDto;
import com.rms.polkole.dto.CheckOutDto;
import com.rms.polkole.service.CheckInOutService;
import com.rms.polkole.service.AuditLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/check-in-out")
@RequiredArgsConstructor
@CrossOrigin
public class CheckInOutController {

    private final CheckInOutService checkInOutService;
    private final AuditLogService auditLogService;

    @PostMapping("/check-in")
    public ResponseEntity<ApiResponse<CheckInDto>> checkIn(@Valid @RequestBody CheckInDto dto) {
        CheckInDto created = checkInOutService.checkIn(dto);
        auditLogService.log("HOTEL CHECK-IN", "Checked in reservation ID: " + dto.getReservationId());
        return ResponseEntity.ok(ApiResponse.success(created, "Guest checked in successfully"));
    }

    @PostMapping("/check-out")
    public ResponseEntity<ApiResponse<CheckOutDto>> checkOut(@Valid @RequestBody CheckOutDto dto) {
        CheckOutDto created = checkInOutService.checkOut(dto);
        auditLogService.log("HOTEL CHECK-OUT", "Checked out reservation ID: " + dto.getReservationId());
        return ResponseEntity.ok(ApiResponse.success(created, "Guest checked out successfully"));
    }

    @GetMapping("/check-in/{reservationId}")
    public ResponseEntity<ApiResponse<CheckInDto>> getCheckInByReservationId(@PathVariable Integer reservationId) {
        CheckInDto checkIn = checkInOutService.getCheckInByReservationId(reservationId);
        return ResponseEntity.ok(ApiResponse.success(checkIn));
    }

    @GetMapping("/check-out/{reservationId}")
    public ResponseEntity<ApiResponse<CheckOutDto>> getCheckOutByReservationId(@PathVariable Integer reservationId) {
        CheckOutDto checkOut = checkInOutService.getCheckOutByReservationId(reservationId);
        return ResponseEntity.ok(ApiResponse.success(checkOut));
    }
}
