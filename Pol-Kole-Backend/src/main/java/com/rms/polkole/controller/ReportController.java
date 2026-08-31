package com.rms.polkole.controller;

import com.rms.polkole.dto.ApiResponse;
import com.rms.polkole.dto.ReportDto.*;
import com.rms.polkole.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@CrossOrigin
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/daily-flash")
    public ResponseEntity<ApiResponse<DailyFlashReportDto>> getDailyFlashReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        DailyFlashReportDto data = reportService.getDailyFlashReport(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/menu-sales")
    public ResponseEntity<ApiResponse<MenuSalesReportDto>> getMenuSalesReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        MenuSalesReportDto data = reportService.getMenuSalesReport(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/hotel-performance")
    public ResponseEntity<ApiResponse<HotelPerformanceReportDto>> getHotelPerformanceReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        HotelPerformanceReportDto data = reportService.getHotelPerformanceReport(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/kitchen-efficiency")
    public ResponseEntity<ApiResponse<KitchenEfficiencyReportDto>> getKitchenEfficiencyReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        KitchenEfficiencyReportDto data = reportService.getKitchenEfficiencyReport(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/staff-productivity")
    public ResponseEntity<ApiResponse<StaffProductivityReportDto>> getStaffProductivityReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        StaffProductivityReportDto data = reportService.getStaffProductivityReport(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/customer-intelligence")
    public ResponseEntity<ApiResponse<CustomerIntelligenceReportDto>> getCustomerIntelligenceReport() {
        CustomerIntelligenceReportDto data = reportService.getCustomerIntelligenceReport();
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/discount-audit")
    public ResponseEntity<ApiResponse<DiscountAuditReportDto>> getDiscountAuditReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        DiscountAuditReportDto data = reportService.getDiscountAuditReport(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/pdf")
    public ResponseEntity<byte[]> downloadReportPdf(
            @RequestParam(defaultValue = "flash") String reportType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        byte[] pdfBytes = reportService.generateReportPdf(reportType, startDate, endDate);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        String filename = "PolKole_" + reportType.toUpperCase() + "_Report_" + LocalDate.now() + ".pdf";
        headers.setContentDispositionFormData("attachment", filename);

        return ResponseEntity.ok().headers(headers).body(pdfBytes);
    }
}
