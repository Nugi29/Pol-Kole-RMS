package com.rms.polkole.controller;

import com.rms.polkole.dto.ApiResponse;
import com.rms.polkole.dto.VoucherDto;
import com.rms.polkole.service.AuditLogService;
import com.rms.polkole.service.VoucherService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/vouchers")
@RequiredArgsConstructor
@CrossOrigin
public class VoucherController {

    private final VoucherService voucherService;
    private final AuditLogService auditLogService;

    @PostMapping
    public ResponseEntity<ApiResponse<VoucherDto>> createVoucher(@Valid @RequestBody VoucherDto dto) {
        VoucherDto created = voucherService.createVoucher(dto);
        auditLogService.log("CREATE VOUCHER", "Created promotional voucher: " + created.getCode() + " (" + created.getDiscountType() + " " + created.getDiscountValue() + ")");
        return ResponseEntity.ok(ApiResponse.success(created, "Voucher created successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<VoucherDto>> updateVoucher(@PathVariable Integer id, @Valid @RequestBody VoucherDto dto) {
        VoucherDto updated = voucherService.updateVoucher(id, dto);
        auditLogService.log("UPDATE VOUCHER", "Updated voucher ID: " + id + " Code: " + updated.getCode());
        return ResponseEntity.ok(ApiResponse.success(updated, "Voucher updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteVoucher(@PathVariable Integer id) {
        VoucherDto voucher = voucherService.getVoucherById(id);
        voucherService.deleteVoucher(id);
        auditLogService.log("DELETE VOUCHER", "Deleted voucher ID: " + id + " Code: " + voucher.getCode());
        return ResponseEntity.ok(ApiResponse.success(null, "Voucher deleted successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<VoucherDto>> getVoucherById(@PathVariable Integer id) {
        VoucherDto voucher = voucherService.getVoucherById(id);
        return ResponseEntity.ok(ApiResponse.success(voucher));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<VoucherDto>>> searchVouchers(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<VoucherDto> list = voucherService.searchVouchers(search, page, size);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<VoucherDto>>> getActiveValidVouchers() {
        List<VoucherDto> list = voucherService.getActiveValidVouchers();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/validate")
    public ResponseEntity<ApiResponse<VoucherDto>> validateVoucher(
            @RequestParam String code,
            @RequestParam(required = false, defaultValue = "0") BigDecimal billAmount,
            @RequestParam(required = false, defaultValue = "ALL") String orderType) {
        VoucherDto result = voucherService.validateVoucher(code, billAmount, orderType);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PatchMapping("/{id}/toggle-status")
    public ResponseEntity<ApiResponse<VoucherDto>> toggleActiveStatus(@PathVariable Integer id) {
        VoucherDto updated = voucherService.toggleActiveStatus(id);
        auditLogService.log("TOGGLE VOUCHER STATUS", "Toggled status for voucher ID " + id + " Code: " + updated.getCode() + " -> " + updated.getStatus());
        return ResponseEntity.ok(ApiResponse.success(updated, "Voucher status updated"));
    }
}
