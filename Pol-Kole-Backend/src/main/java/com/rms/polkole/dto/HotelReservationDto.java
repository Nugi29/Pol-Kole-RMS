package com.rms.polkole.dto;

import lombok.*;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelReservationDto {
    private Integer id;
    private Integer customerId;
    private String customerName;
    private String customerPassport;
    private Integer roomId;
    private String roomNumber;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer guestsCount;
    private String status; // PENDING, CONFIRMED, CANCELLED, CHECKED_IN, CHECKED_OUT
}
