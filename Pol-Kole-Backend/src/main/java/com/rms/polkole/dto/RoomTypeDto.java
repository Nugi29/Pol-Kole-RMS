package com.rms.polkole.dto;

import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomTypeDto {
    private Integer id;
    private String name;
    private String description;
    private Integer maxCapacity;
    private BigDecimal defaultPrice;
    private String amenities;
}
