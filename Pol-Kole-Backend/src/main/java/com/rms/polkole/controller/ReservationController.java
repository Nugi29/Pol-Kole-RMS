package com.rms.polkole.controller;

import com.rms.polkole.dto.ApiResponse;
import com.rms.polkole.dto.ReservationDto;
import com.rms.polkole.service.AuditLogService;
import com.rms.polkole.service.ReservationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
@CrossOrigin
public class ReservationController {

    private final ReservationService reservationService;
    private final AuditLogService auditLogService;

    @PostMapping
    public ResponseEntity<ApiResponse<ReservationDto>> createReservation(@Valid @RequestBody ReservationDto dto) {
        ReservationDto created = reservationService.createReservation(dto);
        auditLogService.log("CREATE RESERVATION", "Created booking ID: " + created.getId() + " for Customer ID: " + created.getCustomerId() + " on Table " + created.getTableNumber());
        return ResponseEntity.ok(ApiResponse.success(created, "Reservation created successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ReservationDto>> updateReservation(@PathVariable Integer id, @Valid @RequestBody ReservationDto dto) {
        ReservationDto updated = reservationService.updateReservation(id, dto);
        auditLogService.log("UPDATE RESERVATION", "Updated booking ID: " + id);
        return ResponseEntity.ok(ApiResponse.success(updated, "Reservation updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> cancelReservation(@PathVariable Integer id) {
        reservationService.cancelReservation(id);
        auditLogService.log("CANCEL RESERVATION", "Cancelled booking ID: " + id);
        return ResponseEntity.ok(ApiResponse.success(null, "Reservation cancelled successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ReservationDto>> getReservationById(@PathVariable Integer id) {
        ReservationDto reservation = reservationService.getReservationById(id);
        return ResponseEntity.ok(ApiResponse.success(reservation));
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<ApiResponse<List<ReservationDto>>> getReservationsByCustomerId(@PathVariable Integer customerId) {
        List<ReservationDto> list = reservationService.getReservationsByCustomerId(customerId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ReservationDto>>> filterReservations(
            @RequestParam(required = false) Integer customerId,
            @RequestParam(required = false) Integer tableId,
            @RequestParam(required = false) Integer statusId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<ReservationDto> reservations = reservationService.filterReservations(customerId, tableId, statusId, startDate, endDate, page, size);
        return ResponseEntity.ok(ApiResponse.success(reservations));
    }
}
