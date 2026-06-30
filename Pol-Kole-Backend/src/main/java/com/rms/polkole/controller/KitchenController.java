package com.rms.polkole.controller;

import com.rms.polkole.dto.ApiResponse;
import com.rms.polkole.dto.KitchenOrderDto;
import com.rms.polkole.service.KitchenService;
import com.rms.polkole.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/kitchen")
@RequiredArgsConstructor
@CrossOrigin
public class KitchenController {

    private final KitchenService kitchenService;
    private final AuditLogService auditLogService;

    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<List<KitchenOrderDto>>> getActiveKitchenOrders() {
        List<KitchenOrderDto> orders = kitchenService.getActiveKitchenOrders();
        return ResponseEntity.ok(ApiResponse.success(orders));
    }

    @PutMapping("/orders/{id}/status")
    public ResponseEntity<ApiResponse<KitchenOrderDto>> updatePreparationStatus(@PathVariable Integer id, @RequestParam String status) {
        KitchenOrderDto updated = kitchenService.updatePreparationStatus(id, status);
        auditLogService.log("UPDATE KITCHEN TICKET STATUS", "Updated kitchen ticket ID " + id + " to " + status);
        return ResponseEntity.ok(ApiResponse.success(updated, "Kitchen preparation status updated successfully"));
    }
}
