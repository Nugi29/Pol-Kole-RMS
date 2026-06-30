package com.rms.polkole.service.impl;

import com.rms.polkole.dto.HotelReservationDto;
import com.rms.polkole.entity.CustomerEntity;
import com.rms.polkole.entity.HotelReservationEntity;
import com.rms.polkole.entity.RoomEntity;
import com.rms.polkole.repository.CustomerRepository;
import com.rms.polkole.repository.HotelReservationRepository;
import com.rms.polkole.repository.RoomRepository;
import com.rms.polkole.service.HotelReservationService;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HotelReservationServiceImpl implements HotelReservationService {

    private final HotelReservationRepository reservationRepository;
    private final CustomerRepository customerRepository;
    private final RoomRepository roomRepository;
    private final ModelMapper mapper;

    @Override
    @Transactional
    public HotelReservationDto createReservation(HotelReservationDto dto) {
        CustomerEntity customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));

        RoomEntity room = roomRepository.findById(dto.getRoomId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        if (dto.getGuestsCount() > room.getCapacity()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Guests count exceeds room capacity");
        }

        boolean isOverlapping = reservationRepository.checkOverlappingReservations(
                room.getId(), dto.getCheckInDate(), dto.getCheckOutDate(), null);
        if (isOverlapping) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Room is already booked for these dates");
        }

        HotelReservationEntity reservation = HotelReservationEntity.builder()
                .customer(customer)
                .room(room)
                .checkInDate(dto.getCheckInDate())
                .checkOutDate(dto.getCheckOutDate())
                .guestsCount(dto.getGuestsCount())
                .status("CONFIRMED")
                .build();

        reservation = reservationRepository.save(reservation);

        // Update room status
        if (dto.getCheckInDate().equals(LocalDate.now())) {
            room.setStatus("OCCUPIED");
            roomRepository.save(room);
        }

        return convertToDto(reservation);
    }

    @Override
    @Transactional
    public HotelReservationDto updateReservation(Integer id, HotelReservationDto dto) {
        HotelReservationEntity reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));

        RoomEntity room = roomRepository.findById(dto.getRoomId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        boolean isOverlapping = reservationRepository.checkOverlappingReservations(
                room.getId(), dto.getCheckInDate(), dto.getCheckOutDate(), id);
        if (isOverlapping) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Room is already booked for these dates");
        }

        CustomerEntity customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));

        reservation.setCustomer(customer);
        reservation.setRoom(room);
        reservation.setCheckInDate(dto.getCheckInDate());
        reservation.setCheckOutDate(dto.getCheckOutDate());
        reservation.setGuestsCount(dto.getGuestsCount());
        if (dto.getStatus() != null) {
            reservation.setStatus(dto.getStatus());
        }

        reservation = reservationRepository.save(reservation);
        return convertToDto(reservation);
    }

    @Override
    @Transactional(readOnly = true)
    public HotelReservationDto getReservationById(Integer id) {
        HotelReservationEntity reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        return convertToDto(reservation);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<HotelReservationDto> filterReservations(Integer customerId, Integer roomId, String status, LocalDate startDate, LocalDate endDate, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("checkInDate").descending());
        Page<HotelReservationEntity> reservations = reservationRepository.filterReservations(customerId, roomId, status, startDate, endDate, pageable);
        return reservations.map(this::convertToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<HotelReservationDto> getReservationsByCustomerId(Integer customerId) {
        return reservationRepository.findByCustomerId(customerId).stream()
                .map(this::convertToDto)
                .toList();
    }

    @Override
    @Transactional
    public void cancelReservation(Integer id) {
        HotelReservationEntity reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found"));
        reservation.setStatus("CANCELLED");
        reservationRepository.save(reservation);

        RoomEntity room = reservation.getRoom();
        if (room != null) {
            room.setStatus("AVAILABLE");
            roomRepository.save(room);
        }
    }

    private HotelReservationDto convertToDto(HotelReservationEntity reservation) {
        HotelReservationDto dto = mapper.map(reservation, HotelReservationDto.class);
        dto.setCustomerId(reservation.getCustomer().getId());
        dto.setCustomerName(reservation.getCustomer().getName());
        dto.setCustomerPassport(reservation.getCustomer().getNicPassport());
        dto.setRoomId(reservation.getRoom().getId());
        dto.setRoomNumber(reservation.getRoom().getRoomNumber());
        return dto;
    }
}
