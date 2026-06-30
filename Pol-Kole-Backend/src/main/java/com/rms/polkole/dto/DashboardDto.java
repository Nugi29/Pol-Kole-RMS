package com.rms.polkole.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardDto {
    private long totalTables;
    private long occupiedTables;
    private long availableTables;
    private long cleaningTables;
    private long activeReservationsToday;
    private long ordersToday;
    private BigDecimal revenueToday;
    private long pendingKitchenOrders;
    private long lowStockInventoryAlerts;
    private Map<String, BigDecimal> monthlyRevenue;
}
