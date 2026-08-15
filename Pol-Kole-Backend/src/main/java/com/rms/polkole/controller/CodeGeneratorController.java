package com.rms.polkole.controller;

import com.rms.polkole.dto.ApiResponse;
import com.rms.polkole.service.CodeGeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/codes")
@RequiredArgsConstructor
@CrossOrigin
public class CodeGeneratorController {

    private final CodeGeneratorService codeGeneratorService;

    @GetMapping("/next-room")
    public ResponseEntity<ApiResponse<String>> getNextRoomNumber(@RequestParam Integer floor) {
        String code = codeGeneratorService.generateNextRoomNumber(floor);
        return ResponseEntity.ok(ApiResponse.success(code));
    }

    @GetMapping("/next-table")
    public ResponseEntity<ApiResponse<String>> getNextTableNumber(@RequestParam String location) {
        String code = codeGeneratorService.generateNextTableNumber(location);
        return ResponseEntity.ok(ApiResponse.success(code));
    }

    @GetMapping("/next-invoice")
    public ResponseEntity<ApiResponse<String>> getNextInvoiceNumber(@RequestParam String type) {
        String code = codeGeneratorService.generateNextInvoiceNumber(type);
        return ResponseEntity.ok(ApiResponse.success(code));
    }

    @GetMapping("/next-customer")
    public ResponseEntity<ApiResponse<String>> getNextCustomerCode() {
        String code = codeGeneratorService.generateNextCustomerCode();
        return ResponseEntity.ok(ApiResponse.success(code));
    }
}
