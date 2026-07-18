package com.rms.polkole.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RestaurantTableDto {
    private Integer id;

    @NotBlank(message = "Table number is required")
    @Size(max = 20, message = "Table number must not exceed 20 characters")
    private String tableNumber;

    @NotNull(message = "Capacity is required")
    @Min(value = 1, message = "Capacity must be at least 1")
    private Integer capacity;

    @NotBlank(message = "Status is required")
    private String status; // AVAILABLE, RESERVED, OCCUPIED, CLEANING

    private String location; // e.g. Main Hall, Terrace

    @Builder.Default
    private Boolean isAvailableForReservation = true;
    // Maintain the original boolean-style accessor used across the codebase.
    // Return primitive boolean to avoid callers needing to handle null.
    public boolean isAvailableForReservation() {
        return Boolean.TRUE.equals(this.isAvailableForReservation);
    }

    // Provide a primitive setter keeping the old API shape.
    public void setAvailableForReservation(boolean available) {
        this.isAvailableForReservation = available;
    }
}
