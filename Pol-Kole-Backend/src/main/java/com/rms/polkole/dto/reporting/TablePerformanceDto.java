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
public class TablePerformanceDto {
    private Integer tableId;
    private String tableNumber;
    private String location;
    private Integer capacity;
    private Long ordersServed;
    private BigDecimal totalRevenue;
    private BigDecimal avgSpendPerOrder;
    private String status;
}
