package com.rms.polkole.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationDto {
    private Integer id;

    @NotNull(message = "Customer ID is required")
    private Integer customerId;

    private String customerName;
    private String customerPassport;

    @NotNull(message = "Table ID is required")
    private Integer tableId;

    private String tableNumber;

    @NotNull(message = "Reservation date is required")
    @FutureOrPresent(message = "Reservation date must be today or in the future")
    private LocalDate reservationDate;

    @NotBlank(message = "Reservation time is required")
    private String reservationTime; // e.g. "18:30"

    @NotNull(message = "Guests count is required")
    @Min(value = 1, message = "Guests count must be at least 1")
    private Integer guestsCount;

    private String specialRequests;
    private Integer reservationStatusId;
    private String reservationStatusName;
}
