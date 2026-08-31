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
public class DailyRevenueDto {
    private String date;
    private BigDecimal grossRevenue;
    private BigDecimal netRevenue;
    private Long orderCount;
    private String topSellingItem;
}
