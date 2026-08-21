package com.rms.polkole.controller;

import com.rms.polkole.dto.ApiResponse;
import com.rms.polkole.dto.ItemDiscountDto;
import com.rms.polkole.service.AuditLogService;
import com.rms.polkole.service.ItemDiscountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/item-discounts")
@RequiredArgsConstructor
@CrossOrigin
public class ItemDiscountController {

    private final ItemDiscountService itemDiscountService;
    private final AuditLogService auditLogService;

    @PostMapping
    public ResponseEntity<ApiResponse<ItemDiscountDto>> createItemDiscount(@Valid @RequestBody ItemDiscountDto dto) {
        ItemDiscountDto created = itemDiscountService.createItemDiscount(dto);
        auditLogService.log("CREATE ITEM DISCOUNT", "Created special discount for: " + created.getMenuItemName() + " (" + created.getTitle() + " - " + created.getDiscountType() + " " + created.getDiscountValue() + ")");
        return ResponseEntity.ok(ApiResponse.success(created, "Item discount created successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ItemDiscountDto>> updateItemDiscount(@PathVariable Integer id, @Valid @RequestBody ItemDiscountDto dto) {
        ItemDiscountDto updated = itemDiscountService.updateItemDiscount(id, dto);
        auditLogService.log("UPDATE ITEM DISCOUNT", "Updated item discount ID: " + id + " for " + updated.getMenuItemName());
        return ResponseEntity.ok(ApiResponse.success(updated, "Item discount updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteItemDiscount(@PathVariable Integer id) {
        ItemDiscountDto discount = itemDiscountService.getItemDiscountById(id);
        itemDiscountService.deleteItemDiscount(id);
        auditLogService.log("DELETE ITEM DISCOUNT", "Deleted item discount ID: " + id + " for " + discount.getMenuItemName());
        return ResponseEntity.ok(ApiResponse.success(null, "Item discount deleted successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ItemDiscountDto>> getItemDiscountById(@PathVariable Integer id) {
        ItemDiscountDto discount = itemDiscountService.getItemDiscountById(id);
        return ResponseEntity.ok(ApiResponse.success(discount));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ItemDiscountDto>>> searchItemDiscounts(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<ItemDiscountDto> list = itemDiscountService.searchItemDiscounts(search, page, size);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<ItemDiscountDto>>> getAllActiveItemDiscounts() {
        List<ItemDiscountDto> list = itemDiscountService.getAllActiveItemDiscounts();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<ApiResponse<ItemDiscountDto>> toggleActiveStatus(@PathVariable Integer id) {
        ItemDiscountDto updated = itemDiscountService.toggleActiveStatus(id);
        auditLogService.log("TOGGLE ITEM DISCOUNT", "Toggled discount status for ID " + id + " -> " + updated.getStatus());
        return ResponseEntity.ok(ApiResponse.success(updated, "Discount status updated"));
    }

    @GetMapping("/effective-price/{menuItemId}")
    public ResponseEntity<ApiResponse<BigDecimal>> getEffectivePrice(@PathVariable Integer menuItemId) {
        BigDecimal price = itemDiscountService.getEffectiveItemPrice(menuItemId);
        return ResponseEntity.ok(ApiResponse.success(price));
    }
}
