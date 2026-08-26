package com.rms.polkole.controller;

import com.rms.polkole.dto.ApiResponse;
import com.rms.polkole.dto.OrderDto;
import com.rms.polkole.service.OrderService;
import com.rms.polkole.service.AuditLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@CrossOrigin
public class OrderController {

    private final OrderService orderService;
    private final AuditLogService auditLogService;

    @PostMapping
    public ResponseEntity<ApiResponse<OrderDto>> createOrder(@Valid @RequestBody OrderDto dto) {
        OrderDto created = orderService.createOrder(dto);
        auditLogService.log("CREATE ORDER", "Placed customer order ID: " + created.getId() + " total: Rs. " + created.getTotalAmount());
        return ResponseEntity.ok(ApiResponse.success(created, "Order placed successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderDto>> updateOrder(@PathVariable Integer id, @Valid @RequestBody OrderDto dto) {
        OrderDto updated = orderService.updateOrder(id, dto);
        auditLogService.log("UPDATE ORDER", "Updated order items list for order ID: " + id);
        return ResponseEntity.ok(ApiResponse.success(updated, "Order updated successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderDto>> getOrderById(@PathVariable Integer id) {
        OrderDto order = orderService.getOrderById(id);
        return ResponseEntity.ok(ApiResponse.success(order));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> cancelOrder(@PathVariable Integer id) {
        orderService.cancelOrder(id);
        auditLogService.log("CANCEL ORDER", "Cancelled order ID: " + id);
        return ResponseEntity.ok(ApiResponse.success(null, "Order cancelled successfully"));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<OrderDto>> updateOrderStatus(@PathVariable Integer id, @RequestParam String status) {
        OrderDto updated = orderService.updateOrderStatus(id, status);
        auditLogService.log("UPDATE ORDER STATUS", "Updated order ID " + id + " status to " + status);
        return ResponseEntity.ok(ApiResponse.success(updated, "Order status updated successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<OrderDto>>> filterOrders(
            @RequestParam(required = false) Integer statusId,
            @RequestParam(required = false) Integer tableId,
            @RequestParam(required = false) Integer roomId,
            @RequestParam(required = false) Integer customerId,
            @RequestParam(required = false) Instant startTime,
            @RequestParam(required = false) Instant endTime,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {
        Page<OrderDto> orders = orderService.filterOrders(statusId, tableId, roomId, customerId, startTime, endTime, page, size);
        return ResponseEntity.ok(ApiResponse.success(orders));
    }
}
