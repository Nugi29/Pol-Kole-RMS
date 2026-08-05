package com.rms.polkole.dto;

import lombok.*;
import java.time.Instant;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KitchenOrderDto {
    private Integer id;
    private Integer orderId;
    private String tableNumber;
    private String roomNumber;
    private List<OrderItemDto> items;
    private String notes;
    private String preparationStatus; // RECEIVED, PREPARING, READY, DELIVERED
    private Integer preparationTimer;
    private Instant startTime;
    private Instant endTime;
    private String customerName;
}
