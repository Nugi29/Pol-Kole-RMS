package com.rms.polkole.dto;

import lombok.*;
import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckInDto {
    private Integer id;
    private Integer reservationId;
    private String roomNumber;
    private String customerName;
    private Instant checkInTime;
    private Integer actualGuestsCount;
    private String notes;
}
