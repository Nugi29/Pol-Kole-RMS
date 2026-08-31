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
public class RoomRevenueDto {
    private Integer roomId;
    private String roomNumber;
    private String roomType;
    private BigDecimal defaultPrice;
    private Long totalStays;
    private BigDecimal generatedRevenue;
    private Double occupancyRate;
}
