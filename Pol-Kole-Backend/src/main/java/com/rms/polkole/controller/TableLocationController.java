package com.rms.polkole.controller;

import com.rms.polkole.dto.ApiResponse;
import com.rms.polkole.dto.TableLocationDto;
import com.rms.polkole.service.TableLocationService;
import com.rms.polkole.service.AuditLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/table-locations")
@RequiredArgsConstructor
@CrossOrigin
public class TableLocationController {

    private final TableLocationService locationService;
    private final AuditLogService auditLogService;

    @PostMapping
    public ResponseEntity<ApiResponse<TableLocationDto>> createLocation(@Valid @RequestBody TableLocationDto dto) {
        TableLocationDto created = locationService.createLocation(dto);
        auditLogService.log("CREATE LOCATION", "Created table location: " + created.getName() + " code: " + created.getCode());
        return ResponseEntity.ok(ApiResponse.success(created, "Table location created successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TableLocationDto>> updateLocation(@PathVariable Integer id, @Valid @RequestBody TableLocationDto dto) {
        TableLocationDto updated = locationService.updateLocation(id, dto);
        auditLogService.log("UPDATE LOCATION", "Updated table location ID: " + id + " name: " + updated.getName());
        return ResponseEntity.ok(ApiResponse.success(updated, "Table location updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteLocation(@PathVariable Integer id) {
        locationService.deleteLocation(id);
        auditLogService.log("DELETE LOCATION", "Soft-deleted table location ID: " + id);
        return ResponseEntity.ok(ApiResponse.success(null, "Table location deleted successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TableLocationDto>> getLocationById(@PathVariable Integer id) {
        TableLocationDto location = locationService.getLocationById(id);
        return ResponseEntity.ok(ApiResponse.success(location));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<TableLocationDto>>> getAllLocations() {
        List<TableLocationDto> locations = locationService.getAllLocations();
        return ResponseEntity.ok(ApiResponse.success(locations));
    }
}