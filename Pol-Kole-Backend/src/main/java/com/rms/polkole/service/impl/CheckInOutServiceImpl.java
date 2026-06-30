package com.rms.polkole.service.impl;

import com.rms.polkole.dto.CheckInDto;
import com.rms.polkole.dto.CheckOutDto;
import com.rms.polkole.entity.CheckInEntity;
import com.rms.polkole.entity.CheckOutEntity;
import com.rms.polkole.entity.HotelReservationEntity;
import com.rms.polkole.entity.RoomEntity;
import com.rms.polkole.repository.CheckInRepository;
import com.rms.polkole.repository.CheckOutRepository;
import com.rms.polkole.repository.HotelReservationRepository;
import com.rms.polkole.repository.RoomRepository;
import com.rms.polkole.service.CheckInOutService;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class CheckInOutServiceImpl implements CheckInOutService {

    private final CheckInRepository checkInRepository;
    private final CheckOutRepository checkOutRepository;
    private final HotelReservationRepository reservationRepository;
    private final RoomRepository roomRepository;
    private final ModelMapper mapper;

    @Override
    @Transactional
    public CheckInDto checkIn(CheckInDto dto) {
        HotelReservationEntity reservation = reservationRepository.findById(dto.getReservationId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));

        if ("CHECKED_IN".equals(reservation.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Already checked in");
        }

        CheckInEntity checkIn = CheckInEntity.builder()
                .reservation(reservation)
                .checkInTime(Instant.now())
                .actualGuestsCount(dto.getActualGuestsCount() != null ? dto.getActualGuestsCount() : reservation.getGuestsCount())
                .notes(dto.getNotes())
                .build();

        checkIn = checkInRepository.save(checkIn);

        reservation.setStatus("CHECKED_IN");
        reservationRepository.save(reservation);

        RoomEntity room = reservation.getRoom();
        room.setStatus("OCCUPIED");
        roomRepository.save(room);

        return convertToDto(checkIn);
    }

    @Override
    @Transactional
    public CheckOutDto checkOut(CheckOutDto dto) {
        HotelReservationEntity reservation = reservationRepository.findById(dto.getReservationId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));

        if ("CHECKED_OUT".equals(reservation.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Already checked out");
        }

        CheckOutEntity checkOut = CheckOutEntity.builder()
                .reservation(reservation)
                .checkOutTime(Instant.now())
                .lateCheckoutFee(dto.getLateCheckoutFee())
                .notes(dto.getNotes())
                .build();

        checkOut = checkOutRepository.save(checkOut);

        reservation.setStatus("CHECKED_OUT");
        reservationRepository.save(reservation);

        RoomEntity room = reservation.getRoom();
        room.setStatus("CLEANING");
        roomRepository.save(room);

        return convertToDto(checkOut);
    }

    @Override
    @Transactional(readOnly = true)
    public CheckInDto getCheckInByReservationId(Integer reservationId) {
        CheckInEntity checkIn = checkInRepository.findByReservationId(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Check-in not found"));
        return convertToDto(checkIn);
    }

    @Override
    @Transactional(readOnly = true)
    public CheckOutDto getCheckOutByReservationId(Integer reservationId) {
        CheckOutEntity checkOut = checkOutRepository.findByReservationId(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Check-out not found"));
        return convertToDto(checkOut);
    }

    private CheckInDto convertToDto(CheckInEntity checkIn) {
        CheckInDto dto = mapper.map(checkIn, CheckInDto.class);
        dto.setReservationId(checkIn.getReservation().getId());
        dto.setRoomNumber(checkIn.getReservation().getRoom().getRoomNumber());
        dto.setCustomerName(checkIn.getReservation().getCustomer().getName());
        return dto;
    }

    private CheckOutDto convertToDto(CheckOutEntity checkOut) {
        CheckOutDto dto = mapper.map(checkOut, CheckOutDto.class);
        dto.setReservationId(checkOut.getReservation().getId());
        dto.setRoomNumber(checkOut.getReservation().getRoom().getRoomNumber());
        dto.setCustomerName(checkOut.getReservation().getCustomer().getName());
        return dto;
    }
}
