package com.rms.polkole.service;

import com.rms.polkole.dto.ReservationDto;
import com.rms.polkole.entity.ReservationEntity;
import org.springframework.data.domain.Page;
import java.time.LocalDate;
import java.util.List;

public interface ReservationService {
    ReservationDto createReservation(ReservationDto reservationDto);
    ReservationDto updateReservation(Integer id, ReservationDto reservationDto);
    void cancelReservation(Integer id);
    ReservationDto getReservationById(Integer id);
    Page<ReservationDto> filterReservations(Integer customerId, Integer tableId, Integer statusId, LocalDate startDate, LocalDate endDate, int page, int size);
    List<ReservationDto> getReservationsByCustomerId(Integer customerId);
    ReservationEntity getReservationEntityById(Integer id);
}
