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

    private boolean isAvailableForReservation = true;
}
