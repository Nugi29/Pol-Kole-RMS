package com.rms.polkole.controller;

import com.rms.polkole.dto.ApiResponse;
import com.rms.polkole.dto.InvoiceDto;
import com.rms.polkole.dto.PaymentDto;
import com.rms.polkole.service.AuditLogService;
import com.rms.polkole.service.BillingService;
import com.rms.polkole.service.JasperReportService;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin
public class BillingController {

    private final BillingService billingService;
    private final JasperReportService jasperReportService;
    private final AuditLogService auditLogService;

    @PostMapping("/invoices/generate/{orderId}")
    public ResponseEntity<ApiResponse<InvoiceDto>> generateInvoice(
            @PathVariable Integer orderId,
            @RequestBody(required = false) InvoiceGenerationRequest req) {
        String code = req != null ? req.getDiscountCode() : null;
        int points = req != null ? req.getRedeemPoints() : 0;

        InvoiceDto invoice = billingService.generateInvoice(orderId, code, points);
        auditLogService.log("GENERATE INVOICE", "Generated invoice " + invoice.getInvoiceNumber() + " for order checkout.");
        return ResponseEntity.ok(ApiResponse.success(invoice, "Invoice generated successfully"));
    }

    @PostMapping("/invoices/generate/stay/{reservationId}")
    public ResponseEntity<ApiResponse<InvoiceDto>> generateStayInvoice(
            @PathVariable Integer reservationId,
            @RequestBody(required = false) InvoiceGenerationRequest req) {
        String code = req != null ? req.getDiscountCode() : null;
        int points = req != null ? req.getRedeemPoints() : 0;

        InvoiceDto invoice = billingService.generateStayInvoice(reservationId, code, points);
        auditLogService.log("GENERATE STAY INVOICE", "Generated stay invoice " + invoice.getInvoiceNumber() + " for reservation checkout.");
        return ResponseEntity.ok(ApiResponse.success(invoice, "Stay invoice generated successfully"));
    }

    @GetMapping("/invoices/reservation/{reservationId}")
    public ResponseEntity<ApiResponse<InvoiceDto>> getInvoiceByReservation(@PathVariable Integer reservationId) {
        InvoiceDto invoice = billingService.getInvoiceByReservationId(reservationId);
        return ResponseEntity.ok(ApiResponse.success(invoice));
    }

    @PostMapping("/invoices/generate/table/{reservationId}")
    public ResponseEntity<ApiResponse<InvoiceDto>> generateTableInvoice(
            @PathVariable Integer reservationId,
            @RequestBody(required = false) InvoiceGenerationRequest req) {
        String code = req != null ? req.getDiscountCode() : null;
        int points = req != null ? req.getRedeemPoints() : 0;

        InvoiceDto invoice = billingService.generateTableInvoice(reservationId, code, points);
        auditLogService.log("GENERATE TABLE INVOICE", "Generated table invoice " + invoice.getInvoiceNumber() + " for table reservation checkout.");
        return ResponseEntity.ok(ApiResponse.success(invoice, "Table invoice generated successfully"));
    }

    @GetMapping("/invoices/table-reservation/{reservationId}")
    public ResponseEntity<ApiResponse<InvoiceDto>> getInvoiceByTableReservation(@PathVariable Integer reservationId) {
        InvoiceDto invoice = billingService.getInvoiceByTableReservationId(reservationId);
        return ResponseEntity.ok(ApiResponse.success(invoice));
    }

    @PostMapping("/payments")
    public ResponseEntity<ApiResponse<Void>> processPayment(@Valid @RequestBody PaymentDto paymentDto) {
        billingService.processPayment(paymentDto);
        auditLogService.log("PROCESS PAYMENT", "Recorded payment for Invoice ID: " + paymentDto.getInvoiceId() + " Amount: $" + paymentDto.getAmount());
        return ResponseEntity.ok(ApiResponse.success(null, "Payment processed successfully. Invoice is now fully settled."));
    }

    @GetMapping("/invoices")
    public ResponseEntity<ApiResponse<List<InvoiceDto>>> getAllInvoices() {
        List<InvoiceDto> list = billingService.getAllInvoices();
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/invoices/order/{orderId}")
    public ResponseEntity<ApiResponse<InvoiceDto>> getInvoiceByOrder(@PathVariable Integer orderId) {
        InvoiceDto invoice = billingService.getInvoiceByOrderId(orderId);
        return ResponseEntity.ok(ApiResponse.success(invoice));
    }

    @GetMapping("/invoices/{id}")
    public ResponseEntity<ApiResponse<InvoiceDto>> getInvoiceById(@PathVariable Integer id) {
        InvoiceDto invoice = billingService.getInvoiceById(id);
        return ResponseEntity.ok(ApiResponse.success(invoice));
    }

    @GetMapping("/invoices/{id}/pdf")
    public ResponseEntity<byte[]> downloadInvoicePdf(@PathVariable Integer id) {
        byte[] pdfBytes = jasperReportService.generateInvoicePdf(id);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", "invoice-" + id + ".pdf");
        headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    @Data
    public static class InvoiceGenerationRequest {
        private String discountCode;
        private int redeemPoints;
    }
}
