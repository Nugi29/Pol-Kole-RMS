package com.rms.polkole.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

public class ReportDto {

    // 1. Daily Flash & Financial Settlement
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyFlashReportDto {
        private String period;
        private BigDecimal grossSales;
        private BigDecimal totalTax;
        private BigDecimal totalDiscounts;
        private BigDecimal netRevenue;
        private Long totalOrders;
        private Long totalInvoices;
        private BigDecimal averageOrderValue;

        private List<PaymentBreakdownDto> paymentMethods;
        private List<ChannelRevenueDto> channelRevenues;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentBreakdownDto {
        private String paymentMethod;
        private Long transactionCount;
        private BigDecimal totalAmount;
        private Double percentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChannelRevenueDto {
        private String channel; // Dine-In, Takeaway, Room Service, Hotel Room Stays
        private Long count;
        private BigDecimal totalRevenue;
        private Double percentage;
    }

    // 2. Full Menu Performance & Sales Report
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MenuSalesReportDto {
        private String period;
        private Long totalMenuItems;
        private Long activeItemsSold;
        private Long totalUnitsSold;
        private BigDecimal totalMenuRevenue;
        private List<CategorySalesDto> categoryBreakdown;
        private List<MenuItemSalesDto> fullMenuList;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MenuItemSalesDto {
        private Integer itemId;
        private String itemName;
        private String categoryName;
        private BigDecimal unitPrice;
        private Long quantitySold;
        private BigDecimal totalRevenue;
        private Double salesContributionPercent;
        private Boolean isAvailable;
        private String performanceTag; // Top Seller, Moderate, Slow Moving, Zero Sales
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategorySalesDto {
        private String categoryName;
        private Long unitsSold;
        private BigDecimal totalRevenue;
        private Double revenueSharePercent;
    }

    // 3. Hotel Accommodation & Yield Report
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HotelPerformanceReportDto {
        private String period;
        private Long totalRooms;
        private Long occupiedRooms;
        private Long availableRooms;
        private Double occupancyRate;
        private BigDecimal totalRoomRevenue;
        private BigDecimal averageDailyRate; // ADR = Total Room Revenue / Rooms Sold
        private BigDecimal revPar;           // RevPAR = Total Room Revenue / Total Available Rooms
        private Long totalCheckIns;
        private Long totalCheckOuts;
        private Double avgLengthOfStayDays;
        private List<RoomTypePerformanceDto> roomTypeBreakdown;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomTypePerformanceDto {
        private String roomTypeName;
        private Long totalRoomsOfType;
        private Long totalStays;
        private BigDecimal defaultPrice;
        private BigDecimal generatedRevenue;
        private Double utilizationRate;
    }

    // 4. Kitchen Speed & Operational Efficiency
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KitchenEfficiencyReportDto {
        private String period;
        private Long totalOrdersPrepared;
        private Double averagePreparationTimeMinutes;
        private Long onTimeOrders;
        private Long delayedOrders;
        private Double onTimeRatePercent;
        private List<ChefStationPerformanceDto> stationBreakdown;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChefStationPerformanceDto {
        private String station;
        private Long ordersHandled;
        private Double avgPrepTimeMinutes;
        private String assignedChefName;
    }

    // 5. Staff Productivity & Waiter Sales
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StaffProductivityReportDto {
        private String period;
        private Long totalStaffMembers;
        private Long totalPresentToday;
        private Long totalAbsentToday;
        private Long totalLateToday;
        private List<WaiterSalesPerformanceDto> waiterSales;
        private List<StaffAttendanceSummaryDto> attendanceSummary;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WaiterSalesPerformanceDto {
        private Integer waiterId;
        private String waiterName;
        private Long ordersServed;
        private BigDecimal totalSalesGenerated;
        private BigDecimal avgTicketSize;
        private Integer rank;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StaffAttendanceSummaryDto {
        private Long staffId;
        private String staffName;
        private String roleName;
        private Long daysPresent;
        private Long daysLate;
        private Long daysAbsent;
        private Double totalHoursWorked;
    }

    // 6. Customer VIP & Loyalty Intelligence
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerIntelligenceReportDto {
        private Long totalCustomers;
        private Long totalLoyaltyPointsIssued;
        private Double repeatCustomerRatePercent;
        private List<VipCustomerDto> topVipCustomers;
        private List<NationalityDistributionDto> nationalityDistribution;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VipCustomerDto {
        private Integer customerId;
        private String customerName;
        private String phone;
        private String nationality;
        private Integer loyaltyPoints;
        private Long totalVisits;
        private BigDecimal lifetimeSpend;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NationalityDistributionDto {
        private String nationality;
        private Long guestCount;
        private Double percentage;
    }

    // 7. Loss Prevention & Discounts Audit
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiscountAuditReportDto {
        private String period;
        private BigDecimal totalDiscountsGiven;
        private Long discountedInvoicesCount;
        private BigDecimal averageDiscountAmount;
        private Long totalVouchersRedeemed;
        private BigDecimal voucherDiscountTotal;
        private Long unpaidInvoicesCount;
        private BigDecimal unpaidInvoicesTotal;
        private List<CashierDiscountAuditDto> cashierDiscounts;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CashierDiscountAuditDto {
        private String staffUsername;
        private Long billsDiscounted;
        private BigDecimal totalDiscountAmount;
        private BigDecimal totalBillAmount;
    }
}
