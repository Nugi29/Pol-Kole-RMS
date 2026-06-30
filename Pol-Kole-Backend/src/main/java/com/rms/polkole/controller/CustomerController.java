package com.rms.polkole.controller;

import com.rms.polkole.dto.ApiResponse;
import com.rms.polkole.dto.CustomerDto;
import com.rms.polkole.service.AuditLogService;
import com.rms.polkole.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@CrossOrigin
public class CustomerController {

    private final CustomerService customerService;
    private final AuditLogService auditLogService;

    @PostMapping
    public ResponseEntity<ApiResponse<CustomerDto>> createCustomer(@Valid @RequestBody CustomerDto dto) {
        CustomerDto created = customerService.createCustomer(dto);
        auditLogService.log("CREATE CUSTOMER", "Created customer profile: " + created.getName() + " with Passport/NIC " + created.getNicPassport());
        return ResponseEntity.ok(ApiResponse.success(created, "Customer profile created successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerDto>> updateCustomer(@PathVariable Integer id, @Valid @RequestBody CustomerDto dto) {
        CustomerDto updated = customerService.updateCustomer(id, dto);
        auditLogService.log("UPDATE CUSTOMER", "Updated customer profile ID: " + id);
        return ResponseEntity.ok(ApiResponse.success(updated, "Customer profile updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCustomer(@PathVariable Integer id) {
        CustomerDto customer = customerService.getCustomerById(id);
        customerService.deleteCustomer(id);
        auditLogService.log("DELETE CUSTOMER", "Deleted customer ID: " + id + " Name: " + customer.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "Customer profile deleted successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<CustomerDto>> getCustomerById(@PathVariable Integer id) {
        CustomerDto customer = customerService.getCustomerById(id);
        return ResponseEntity.ok(ApiResponse.success(customer));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Page<CustomerDto>>> searchCustomers(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<CustomerDto> list = customerService.searchCustomers(search, page, size);
        return ResponseEntity.ok(ApiResponse.success(list));
    }
}
