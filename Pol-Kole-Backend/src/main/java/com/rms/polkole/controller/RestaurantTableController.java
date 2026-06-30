package com.rms.polkole.controller;

import com.rms.polkole.dto.ApiResponse;
import com.rms.polkole.dto.RestaurantTableDto;
import com.rms.polkole.service.RestaurantTableService;
import com.rms.polkole.service.AuditLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tables")
@RequiredArgsConstructor
@CrossOrigin
public class RestaurantTableController {

    private final RestaurantTableService tableService;
    private final AuditLogService auditLogService;

    @PostMapping
    public ResponseEntity<ApiResponse<RestaurantTableDto>> createTable(@Valid @RequestBody RestaurantTableDto dto) {
        RestaurantTableDto created = tableService.createTable(dto);
        auditLogService.log("CREATE TABLE", "Created table number: " + created.getTableNumber() + " capacity: " + created.getCapacity());
        return ResponseEntity.ok(ApiResponse.success(created, "Table created successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RestaurantTableDto>> updateTable(@PathVariable Integer id, @Valid @RequestBody RestaurantTableDto dto) {
        RestaurantTableDto updated = tableService.updateTable(id, dto);
        auditLogService.log("UPDATE TABLE", "Updated table number: " + updated.getTableNumber());
        return ResponseEntity.ok(ApiResponse.success(updated, "Table updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTable(@PathVariable Integer id) {
        RestaurantTableDto table = tableService.getTableById(id);
        tableService.deleteTable(id);
        auditLogService.log("DELETE TABLE", "Soft-deleted table number: " + table.getTableNumber());
        return ResponseEntity.ok(ApiResponse.success(null, "Table deleted successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RestaurantTableDto>> getTableById(@PathVariable Integer id) {
        RestaurantTableDto table = tableService.getTableById(id);
        return ResponseEntity.ok(ApiResponse.success(table));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<RestaurantTableDto>>> filterTables(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Integer capacity,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<RestaurantTableDto> tables = tableService.filterTables(status, location, capacity, search, page, size);
        return ResponseEntity.ok(ApiResponse.success(tables));
    }
}
