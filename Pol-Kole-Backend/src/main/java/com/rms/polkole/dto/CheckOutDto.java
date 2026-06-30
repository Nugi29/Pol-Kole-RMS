package com.rms.polkole.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckOutDto {
    private Integer id;
    private Integer reservationId;
    private String roomNumber;
    private String customerName;
    private Instant checkOutTime;
    private BigDecimal lateCheckoutFee;
    private String notes;
}
