package com.rms.polkole.service;

import com.rms.polkole.dto.HotelReservationDto;
import org.springframework.data.domain.Page;
import java.time.LocalDate;
import java.util.List;

public interface HotelReservationService {
    HotelReservationDto createReservation(HotelReservationDto dto);
    HotelReservationDto updateReservation(Integer id, HotelReservationDto dto);
    HotelReservationDto getReservationById(Integer id);
    Page<HotelReservationDto> filterReservations(Integer customerId, Integer roomId, String status, LocalDate startDate, LocalDate endDate, int page, int size);
    List<HotelReservationDto> getReservationsByCustomerId(Integer customerId);
    void cancelReservation(Integer id);
}
