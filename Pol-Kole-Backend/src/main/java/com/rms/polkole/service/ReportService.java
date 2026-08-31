package com.rms.polkole.service;

import com.rms.polkole.dto.ReportDto.*;
import com.rms.polkole.dto.RestaurantTableDto;
import com.rms.polkole.dto.reporting.*;

import java.time.LocalDate;
import java.util.List;

public interface ReportService {
    // Existing Manual Reports (kept 100% intact for backward compatibility)
    DailyFlashReportDto getDailyFlashReport(LocalDate startDate, LocalDate endDate);
    MenuSalesReportDto getMenuSalesReport(LocalDate startDate, LocalDate endDate);
    HotelPerformanceReportDto getHotelPerformanceReport(LocalDate startDate, LocalDate endDate);
    KitchenEfficiencyReportDto getKitchenEfficiencyReport(LocalDate startDate, LocalDate endDate);
    StaffProductivityReportDto getStaffProductivityReport(LocalDate startDate, LocalDate endDate);
    CustomerIntelligenceReportDto getCustomerIntelligenceReport();
    DiscountAuditReportDto getDiscountAuditReport(LocalDate startDate, LocalDate endDate);
    byte[] generateReportPdf(String reportType, LocalDate startDate, LocalDate endDate);

    // Generic AI Reporting Capabilities
    SalesReportDto getSalesReport(LocalDate startDate, LocalDate endDate);
    List<ItemSalesDto> getItemSalesReport(String category, LocalDate startDate, LocalDate endDate, SortDirection sortDirection, Integer limit);
    OrderStatisticsDto getOrderStatistics(LocalDate startDate, LocalDate endDate);
    List<RestaurantTableDto> getAvailableTables();
    List<TablePerformanceDto> getTablePerformance(LocalDate startDate, LocalDate endDate, SortDirection sortDirection, Integer limit);
    List<RoomRevenueDto> getRoomRevenue(LocalDate startDate, LocalDate endDate);
    ReservationStatisticsDto getReservationStatistics(LocalDate startDate, LocalDate endDate);
    TakeawayStatisticsDto getTakeawayStatistics(LocalDate startDate, LocalDate endDate);
    List<ItemSalesDto> getPopularItems(String category, LocalDate startDate, LocalDate endDate, Integer limit);
    List<DailyRevenueDto> getDailyRevenue(LocalDate startDate, LocalDate endDate);

    byte[] generateAiReportPdf(String reportType, LocalDate startDate, LocalDate endDate, AiReportAnalysisDto aiAnalysis);
}
