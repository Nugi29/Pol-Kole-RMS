package com.rms.polkole.dto.reporting;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderStatisticsDto {
    private String period;
    private Long totalOrders;
    private Long completedOrders;
    private Long activeOrders;
    private Long cancelledOrders;
    private Long dineInOrders;
    private Long takeawayOrders;
    private Long roomServiceOrders;
    private BigDecimal totalOrderValue;
    private BigDecimal averageTicketSize;
    private String busiestDay;
    private Long busiestDayOrderCount;
}
