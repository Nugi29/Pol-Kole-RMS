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
public class ItemSalesDto {
    private Integer itemId;
    private String itemName;
    private String categoryName;
    private BigDecimal unitPrice;
    private Long quantitySold;
    private BigDecimal totalRevenue;
    private Double salesContributionPercent;
    private Boolean isAvailable;
    private String performanceTag;
}
