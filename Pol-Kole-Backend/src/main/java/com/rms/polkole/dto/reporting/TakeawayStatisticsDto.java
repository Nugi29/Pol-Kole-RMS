package com.rms.polkole.dto.reporting;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TakeawayStatisticsDto {
    private String period;
    private Long totalTakeawayOrders;
    private BigDecimal totalTakeawayRevenue;
    private BigDecimal averageTakeawayValue;
    private List<ItemSalesDto> topTakeawayItems;
}
