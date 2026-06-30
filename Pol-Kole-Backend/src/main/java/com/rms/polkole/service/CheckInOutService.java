package com.rms.polkole.service;

import com.rms.polkole.dto.CheckInDto;
import com.rms.polkole.dto.CheckOutDto;

public interface CheckInOutService {
    CheckInDto checkIn(CheckInDto dto);
    CheckOutDto checkOut(CheckOutDto dto);
    CheckInDto getCheckInByReservationId(Integer reservationId);
    CheckOutDto getCheckOutByReservationId(Integer reservationId);
}
