package com.rms.polkole.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderDto {
    private Integer id;

    private Integer customerId;
    private String customerName;

    private Integer tableId;
    private String tableNumber;

    private Integer roomId;
    private String roomNumber;

    private Integer assignedWaiterId;
    private String assignedWaiterName;

    @NotNull(message = "Order items list cannot be empty")
    @Size(min = 1, message = "At least one item must be ordered")
    private List<OrderItemDto> items;

    private Integer statusId;
    private String statusName;

    private Instant orderTime;
    private BigDecimal totalAmount;
    private String notes;
}
