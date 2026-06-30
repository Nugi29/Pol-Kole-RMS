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
public class InventoryItemDto {
    private Integer id;

    @NotBlank(message = "Item name is required")
    @Size(max = 150, message = "Item name must not exceed 150 characters")
    private String itemName;

    @NotNull(message = "Quantity is required")
    @DecimalMin(value = "0.00", message = "Quantity cannot be negative")
    private BigDecimal quantity;

    @NotBlank(message = "Unit is required")
    private String unit; // KG, LITER, UNIT, BOX

    private String supplier;

    private Instant expiryDate;

    @NotNull(message = "Minimum stock level is required")
    @DecimalMin(value = "0.00", message = "Minimum stock level cannot be negative")
    private BigDecimal minimumStockLevel;
}
