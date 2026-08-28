package com.rms.polkole.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardDto {
    // Table Metrics
    private long totalTables;
    private long occupiedTables;
    private long availableTables;
    private long cleaningTables;
    private double tableOccupancyRate;

    // Room Metrics
    private long totalRooms;
    private long occupiedRooms;
    private long availableRooms;
    private long cleaningRooms;
    private long maintenanceRooms;
    private double roomOccupancyRate;

    // Reservation & Arrival Metrics
    private long activeTableReservationsToday;
    private long activeHotelReservationsToday;
    private long checkInsToday;
    private long checkOutsToday;
    private long activeRoomStaysToday;

    // Orders & Financial Metrics
    private long ordersToday;
    private long ordersThisWeek;
    private long ordersThisMonth;
    private BigDecimal revenueToday;
    private BigDecimal revenueThisWeek;
    private BigDecimal revenueThisMonth;
    private BigDecimal averageOrderValue;
    private long paidInvoicesToday;
    private long unpaidInvoicesToday;
    private BigDecimal unpaidInvoicesTotalAmount;

    // Operational Counters
    private long pendingKitchenOrders;
    private long readyKitchenOrders;
    private long lowStockInventoryAlerts;
    private long staffOnDutyToday;
    private long totalStaffCount;

    // Order Type Distribution
    private long dineInOrdersCount;
    private long takeawayOrdersCount;
    private long roomServiceOrdersCount;

    // Trends & Breakdown Maps
    private Map<String, BigDecimal> monthlyRevenue;
    private Map<String, BigDecimal> weeklyRevenue;
    private Map<String, BigDecimal> revenueByChannel;
    private Map<String, Long> orderStatusDistribution;

    // Detailed List Collections for Live Feeds
    private List<RecentOrderSummaryDto> recentOrders;
    private List<DashboardReservationDto> todaysReservations;
    private List<TopSellingItemDto> topSellingItems;
    private List<LowStockAlertDto> lowStockItems;
    private List<KitchenTicketSummaryDto> activeKitchenTickets;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentOrderSummaryDto {
        private Integer id;
        private String orderNumber;
        private Instant orderTime;
        private String orderType; // DINE_IN, TAKEAWAY, ROOM_SERVICE
        private String locationInfo;
        private String customerName;
        private BigDecimal totalAmount;
        private String status;
        private Integer itemCount;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DashboardReservationDto {
        private Integer id;
        private String reservationType; // TABLE or ROOM
        private String customerName;
        private String customerContact;
        private String targetNumber;
        private String reservationTimeOrDate;
        private Integer guestsCount;
        private String status;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopSellingItemDto {
        private Integer itemId;
        private String itemName;
        private String categoryName;
        private long quantitySold;
        private BigDecimal totalRevenue;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LowStockAlertDto {
        private Integer itemId;
        private String itemName;
        private String unit;
        private BigDecimal currentStock;
        private BigDecimal minimumStockLevel;
        private String status;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KitchenTicketSummaryDto {
        private Integer ticketId;
        private Integer orderId;
        private String station;
        private String preparationStatus;
        private Integer preparationTimer;
        private Instant startTime;
        private String locationInfo;
        private Integer itemsCount;
    }
}
