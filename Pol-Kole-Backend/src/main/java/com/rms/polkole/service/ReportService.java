package com.rms.polkole.service;

import com.rms.polkole.dto.ReportDto.*;

import java.time.LocalDate;

public interface ReportService {
    DailyFlashReportDto getDailyFlashReport(LocalDate startDate, LocalDate endDate);
    MenuSalesReportDto getMenuSalesReport(LocalDate startDate, LocalDate endDate);
    HotelPerformanceReportDto getHotelPerformanceReport(LocalDate startDate, LocalDate endDate);
    KitchenEfficiencyReportDto getKitchenEfficiencyReport(LocalDate startDate, LocalDate endDate);
    StaffProductivityReportDto getStaffProductivityReport(LocalDate startDate, LocalDate endDate);
    CustomerIntelligenceReportDto getCustomerIntelligenceReport();
    DiscountAuditReportDto getDiscountAuditReport(LocalDate startDate, LocalDate endDate);

    byte[] generateReportPdf(String reportType, LocalDate startDate, LocalDate endDate);
}
