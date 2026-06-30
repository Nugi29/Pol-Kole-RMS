package com.rms.polkole.controller;

import com.rms.polkole.dto.ApiResponse;
import com.rms.polkole.dto.InventoryItemDto;
import com.rms.polkole.dto.StockTransactionDto;
import com.rms.polkole.service.InventoryService;
import com.rms.polkole.service.AuditLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@CrossOrigin
public class InventoryController {

    private final InventoryService inventoryService;
    private final AuditLogService auditLogService;

    @PostMapping
    public ResponseEntity<ApiResponse<InventoryItemDto>> createItem(@Valid @RequestBody InventoryItemDto dto) {
        InventoryItemDto created = inventoryService.createItem(dto);
        auditLogService.log("CREATE INVENTORY ITEM", "Added new ingredient: " + created.getItemName());
        return ResponseEntity.ok(ApiResponse.success(created, "Inventory item created successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<InventoryItemDto>> updateItem(@PathVariable Integer id, @Valid @RequestBody InventoryItemDto dto) {
        InventoryItemDto updated = inventoryService.updateItem(id, dto);
        auditLogService.log("UPDATE INVENTORY ITEM", "Updated details of ingredient: " + updated.getItemName());
        return ResponseEntity.ok(ApiResponse.success(updated, "Inventory item updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteItem(@PathVariable Integer id) {
        InventoryItemDto item = inventoryService.getItemById(id);
        inventoryService.deleteItem(id);
        auditLogService.log("DELETE INVENTORY ITEM", "Soft-deleted ingredient: " + item.getItemName());
        return ResponseEntity.ok(ApiResponse.success(null, "Inventory item deleted successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<InventoryItemDto>> getItemById(@PathVariable Integer id) {
        InventoryItemDto item = inventoryService.getItemById(id);
        return ResponseEntity.ok(ApiResponse.success(item));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<InventoryItemDto>>> filterInventory(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        Page<InventoryItemDto> items = inventoryService.filterInventory(search, page, size);
        return ResponseEntity.ok(ApiResponse.success(items));
    }

    @GetMapping("/alerts")
    public ResponseEntity<ApiResponse<List<InventoryItemDto>>> getLowStockItems() {
        List<InventoryItemDto> alerts = inventoryService.getLowStockItems();
        return ResponseEntity.ok(ApiResponse.success(alerts));
    }

    @PostMapping("/{id}/restock")
    public ResponseEntity<ApiResponse<StockTransactionDto>> restockItem(
            @PathVariable Integer id,
            @RequestParam BigDecimal quantity,
            @RequestParam(defaultValue = "Restocked via dashboard") String reason) {
        StockTransactionDto tx = inventoryService.addStock(id, quantity, reason);
        auditLogService.log("ADD STOCK", "Restocked ingredient ID: " + id + " qty: " + quantity);
        return ResponseEntity.ok(ApiResponse.success(tx, "Stock updated successfully"));
    }

    @PostMapping("/{id}/deduct")
    public ResponseEntity<ApiResponse<StockTransactionDto>> deductItem(
            @PathVariable Integer id,
            @RequestParam BigDecimal quantity,
            @RequestParam(defaultValue = "Manual deduction") String reason) {
        StockTransactionDto tx = inventoryService.deductStock(id, quantity, reason);
        auditLogService.log("DEDUCT STOCK", "Deducted ingredient ID: " + id + " qty: " + quantity);
        return ResponseEntity.ok(ApiResponse.success(tx, "Stock deducted successfully"));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<ApiResponse<Page<StockTransactionDto>>> getTransactionHistory(
            @PathVariable Integer id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<StockTransactionDto> history = inventoryService.getTransactionHistory(id, page, size);
        return ResponseEntity.ok(ApiResponse.success(history));
    }
}
