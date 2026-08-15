package com.rms.polkole.controller;

import com.rms.polkole.dto.ApiResponse;
import com.rms.polkole.dto.RoomDto;
import com.rms.polkole.dto.RoomTypeDto;
import com.rms.polkole.service.RoomService;
import com.rms.polkole.service.AuditLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
@CrossOrigin
public class RoomController {

    private final RoomService roomService;
    private final AuditLogService auditLogService;

    @PostMapping
    public ResponseEntity<ApiResponse<RoomDto>> createRoom(@Valid @RequestBody RoomDto dto) {
        RoomDto created = roomService.createRoom(dto);
        auditLogService.log("CREATE ROOM", "Created room number: " + created.getRoomNumber());
        return ResponseEntity.ok(ApiResponse.success(created, "Room created successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RoomDto>> updateRoom(@PathVariable Integer id, @Valid @RequestBody RoomDto dto) {
        RoomDto updated = roomService.updateRoom(id, dto);
        auditLogService.log("UPDATE ROOM", "Updated room number: " + updated.getRoomNumber());
        return ResponseEntity.ok(ApiResponse.success(updated, "Room updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRoom(@PathVariable Integer id) {
        RoomDto room = roomService.getRoomById(id);
        roomService.deleteRoom(id);
        auditLogService.log("DELETE ROOM", "Soft-deleted room number: " + room.getRoomNumber());
        return ResponseEntity.ok(ApiResponse.success(null, "Room deleted successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RoomDto>> getRoomById(@PathVariable Integer id) {
        RoomDto room = roomService.getRoomById(id);
        return ResponseEntity.ok(ApiResponse.success(room));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<RoomDto>>> filterRooms(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Integer capacity,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<RoomDto> rooms = roomService.filterRooms(status, capacity, page, size);
        return ResponseEntity.ok(ApiResponse.success(rooms));
    }

    // Room Types
    @PostMapping("/types")
    public ResponseEntity<ApiResponse<RoomTypeDto>> createRoomType(@Valid @RequestBody RoomTypeDto dto) {
        RoomTypeDto created = roomService.createRoomType(dto);
        return ResponseEntity.ok(ApiResponse.success(created, "Room type created successfully"));
    }

    @GetMapping("/types")
    public ResponseEntity<ApiResponse<List<RoomTypeDto>>> getAllRoomTypes() {
        List<RoomTypeDto> types = roomService.getAllRoomTypes();
        return ResponseEntity.ok(ApiResponse.success(types));
    }

    @PutMapping("/types/{id}")
    public ResponseEntity<ApiResponse<RoomTypeDto>> updateRoomType(@PathVariable Integer id, @Valid @RequestBody RoomTypeDto dto) {
        RoomTypeDto updated = roomService.updateRoomType(id, dto);
        auditLogService.log("UPDATE ROOM TYPE", "Updated room type: " + updated.getName());
        return ResponseEntity.ok(ApiResponse.success(updated, "Room type updated successfully"));
    }

    @DeleteMapping("/types/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRoomType(@PathVariable Integer id) {
        roomService.deleteRoomType(id);
        auditLogService.log("DELETE ROOM TYPE", "Deleted room type ID: " + id);
        return ResponseEntity.ok(ApiResponse.success(null, "Room type deleted successfully"));
    }
}
