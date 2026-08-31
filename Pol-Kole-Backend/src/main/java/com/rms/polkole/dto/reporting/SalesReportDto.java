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
public class SalesReportDto {
    private String period;
    private BigDecimal grossSales;
    private BigDecimal totalTax;
    private BigDecimal totalDiscounts;
    private BigDecimal netRevenue;
    private Long totalOrders;
    private Long totalInvoices;
    private BigDecimal averageOrderValue;
    private BigDecimal dineInRevenue;
    private BigDecimal takeawayRevenue;
    private BigDecimal roomServiceRevenue;
    private BigDecimal hotelStayRevenue;
    private List<ItemSalesDto> topSellingItems;
    private List<ItemSalesDto> leastSellingItems;
}
