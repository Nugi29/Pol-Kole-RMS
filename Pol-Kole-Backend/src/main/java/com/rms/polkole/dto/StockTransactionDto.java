package com.rms.polkole.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockTransactionDto {
    private Integer id;

    @NotNull(message = "Inventory item is required")
    private Integer inventoryItemId;

    private String inventoryItemName;

    @NotBlank(message = "Transaction type is required")
    private String transactionType; // IN, OUT

    @NotNull(message = "Quantity is required")
    @DecimalMin(value = "0.01", message = "Quantity must be positive")
    private BigDecimal quantity;

    private String reason;

    private Instant transactionTime;
}
