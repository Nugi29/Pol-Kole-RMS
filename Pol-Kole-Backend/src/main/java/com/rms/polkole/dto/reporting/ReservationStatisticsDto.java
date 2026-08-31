package com.rms.polkole.dto.reporting;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationStatisticsDto {
    private String period;
    private Long totalTableReservations;
    private Long confirmedTableReservations;
    private Long cancelledTableReservations;
    private Long totalHotelReservations;
    private Long confirmedHotelReservations;
    private Long checkedInHotelReservations;
    private Long checkedOutHotelReservations;
}
