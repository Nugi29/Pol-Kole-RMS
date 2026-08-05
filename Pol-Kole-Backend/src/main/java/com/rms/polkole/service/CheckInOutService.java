package com.rms.polkole.service;

import com.rms.polkole.dto.CheckInDto;
import com.rms.polkole.dto.CheckOutDto;

public interface CheckInOutService {
    CheckInDto checkIn(CheckInDto dto);
    CheckOutDto checkOut(CheckOutDto dto);
    CheckInDto getCheckInByReservationId(Integer reservationId);
    CheckOutDto getCheckOutByReservationId(Integer reservationId);
    void tableCheckIn(Integer reservationId);
    void tableCheckOut(Integer reservationId);
}
