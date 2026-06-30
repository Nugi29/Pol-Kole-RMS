package com.rms.polkole.controller;

import com.rms.polkole.dto.ApiResponse;
import com.rms.polkole.dto.HotelReservationDto;
import com.rms.polkole.service.HotelReservationService;
import com.rms.polkole.service.AuditLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/hotel-reservations")
@RequiredArgsConstructor
@CrossOrigin
public class HotelReservationController {

    private final HotelReservationService reservationService;
    private final AuditLogService auditLogService;

    @PostMapping
    public ResponseEntity<ApiResponse<HotelReservationDto>> createReservation(@Valid @RequestBody HotelReservationDto dto) {
        HotelReservationDto created = reservationService.createReservation(dto);
        auditLogService.log("CREATE HOTEL RESERVATION", "Created reservation ID: " + created.getId());
        return ResponseEntity.ok(ApiResponse.success(created, "Hotel reservation created successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<HotelReservationDto>> updateReservation(@PathVariable Integer id, @Valid @RequestBody HotelReservationDto dto) {
        HotelReservationDto updated = reservationService.updateReservation(id, dto);
        auditLogService.log("UPDATE HOTEL RESERVATION", "Updated reservation ID: " + id);
        return ResponseEntity.ok(ApiResponse.success(updated, "Hotel reservation updated successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<HotelReservationDto>> getReservationById(@PathVariable Integer id) {
        HotelReservationDto reservation = reservationService.getReservationById(id);
        return ResponseEntity.ok(ApiResponse.success(reservation));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<HotelReservationDto>>> filterReservations(
            @RequestParam(required = false) Integer customerId,
            @RequestParam(required = false) Integer roomId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<HotelReservationDto> pageRes = reservationService.filterReservations(customerId, roomId, status, startDate, endDate, page, size);
        return ResponseEntity.ok(ApiResponse.success(pageRes));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> cancelReservation(@PathVariable Integer id) {
        reservationService.cancelReservation(id);
        auditLogService.log("CANCEL HOTEL RESERVATION", "Cancelled reservation ID: " + id);
        return ResponseEntity.ok(ApiResponse.success(null, "Hotel reservation cancelled successfully"));
    }
}
