package com.rms.polkole.reporting.ai;

import com.rms.polkole.dto.RestaurantTableDto;
import com.rms.polkole.dto.reporting.*;
import com.rms.polkole.service.ReportService;
import com.rms.polkole.util.DateRangeResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReportTools {

    private final ReportService reportService;

    @Tool(description = "Get high-level sales and revenue figures (gross sales, net revenue, taxes, discounts, order counts, channel revenues, top and least selling items) for a given date range or expression (e.g., 'today', 'this month', 'last month', 'August', 'this year').")
    public SalesReportDto getSalesReport(String dateExpression) {
        log.info("AI Tool getSalesReport called with dateExpression='{}'", dateExpression);
        DateRangeResolver.DateRange dr = DateRangeResolver.resolve(dateExpression);
        return reportService.getSalesReport(dr.getStartDate(), dr.getEndDate());
    }

    @Tool(description = "Get item sales report filtered by category (e.g. 'beverage', 'tea', 'kottu', 'dessert', 'curry', or null for all categories) and date expression. Set sortDirection to 'ASC' to find least-selling items, or 'DESC' to find most-selling/top items. Limit specifies maximum items to return.")
    public List<ItemSalesDto> getItemSalesReport(String category, String dateExpression, SortDirection sortDirection, Integer limit) {
        log.info("AI Tool getItemSalesReport called: category='{}', date='{}', sort='{}', limit={}", category, dateExpression, sortDirection, limit);
        DateRangeResolver.DateRange dr = DateRangeResolver.resolve(dateExpression);
        return reportService.getItemSalesReport(category, dr.getStartDate(), dr.getEndDate(), sortDirection, limit);
    }

    @Tool(description = "Get order statistics including total order count, completed, active, cancelled, dine-in vs takeaway vs room service count, average ticket size, and the busiest day for a date expression (e.g., 'this week', 'this month', 'today').")
    public OrderStatisticsDto getOrderStatistics(String dateExpression) {
        log.info("AI Tool getOrderStatistics called with dateExpression='{}'", dateExpression);
        DateRangeResolver.DateRange dr = DateRangeResolver.resolve(dateExpression);
        return reportService.getOrderStatistics(dr.getStartDate(), dr.getEndDate());
    }

    @Tool(description = "Get all currently available restaurant tables and their seating capacity.")
    public List<RestaurantTableDto> getAvailableTables() {
        log.info("AI Tool getAvailableTables called");
        return reportService.getAvailableTables();
    }

    @Tool(description = "Get restaurant table performance ranking (orders served, revenue generated, and average spend per table) for a date range. Use sortDirection 'DESC' for best performing tables.")
    public List<TablePerformanceDto> getTablePerformance(String dateExpression, SortDirection sortDirection, Integer limit) {
        log.info("AI Tool getTablePerformance called with dateExpression='{}'", dateExpression);
        DateRangeResolver.DateRange dr = DateRangeResolver.resolve(dateExpression);
        return reportService.getTablePerformance(dr.getStartDate(), dr.getEndDate(), sortDirection, limit);
    }

    @Tool(description = "Get hotel room accommodation revenue, number of guest stays, and occupancy percentage for a date range.")
    public List<RoomRevenueDto> getRoomRevenue(String dateExpression) {
        log.info("AI Tool getRoomRevenue called with dateExpression='{}'", dateExpression);
        DateRangeResolver.DateRange dr = DateRangeResolver.resolve(dateExpression);
        return reportService.getRoomRevenue(dr.getStartDate(), dr.getEndDate());
    }

    @Tool(description = "Get reservation counts (confirmed, pending, checked in, cancelled) for dining tables and hotel rooms.")
    public ReservationStatisticsDto getReservationStatistics(String dateExpression) {
        log.info("AI Tool getReservationStatistics called with dateExpression='{}'", dateExpression);
        DateRangeResolver.DateRange dr = DateRangeResolver.resolve(dateExpression);
        return reportService.getReservationStatistics(dr.getStartDate(), dr.getEndDate());
    }

    @Tool(description = "Get takeaway orders count, takeaway total revenue, average takeaway ticket size, and top takeaway dishes for a date range.")
    public TakeawayStatisticsDto getTakeawayStatistics(String dateExpression) {
        log.info("AI Tool getTakeawayStatistics called with dateExpression='{}'", dateExpression);
        DateRangeResolver.DateRange dr = DateRangeResolver.resolve(dateExpression);
        return reportService.getTakeawayStatistics(dr.getStartDate(), dr.getEndDate());
    }

    @Tool(description = "Get popular and top-selling food or beverage items for a date range.")
    public List<ItemSalesDto> getPopularItems(String category, String dateExpression, Integer limit) {
        log.info("AI Tool getPopularItems called with category='{}', date='{}'", category, dateExpression);
        DateRangeResolver.DateRange dr = DateRangeResolver.resolve(dateExpression);
        return reportService.getPopularItems(category, dr.getStartDate(), dr.getEndDate(), limit);
    }

    @Tool(description = "Get day-by-day daily revenue and order counts for a date range.")
    public List<DailyRevenueDto> getDailyRevenue(String dateExpression) {
        log.info("AI Tool getDailyRevenue called with dateExpression='{}'", dateExpression);
        DateRangeResolver.DateRange dr = DateRangeResolver.resolve(dateExpression);
        return reportService.getDailyRevenue(dr.getStartDate(), dr.getEndDate());
    }
}
