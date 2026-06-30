package com.rms.polkole.service.impl;

import com.rms.polkole.dto.ReservationDto;
import com.rms.polkole.entity.CustomerEntity;
import com.rms.polkole.entity.ReservationEntity;
import com.rms.polkole.entity.ReservationStatusEntity;
import com.rms.polkole.entity.RestaurantTableEntity;
import com.rms.polkole.repository.CustomerRepository;
import com.rms.polkole.repository.ReservationRepository;
import com.rms.polkole.repository.ReservationStatusRepository;
import com.rms.polkole.repository.RestaurantTableRepository;
import com.rms.polkole.service.ReservationService;
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
public class ReservationServiceImpl implements ReservationService {

    private final ReservationRepository reservationRepository;
    private final CustomerRepository customerRepository;
    private final RestaurantTableRepository tableRepository;
    private final ReservationStatusRepository statusRepository;
    private final ModelMapper mapper;

    @Override
    @Transactional
    public ReservationDto createReservation(ReservationDto dto) {
        CustomerEntity customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found with ID: " + dto.getCustomerId()));

        RestaurantTableEntity table = tableRepository.findById(dto.getTableId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Table not found with ID: " + dto.getTableId()));

        if (dto.getGuestsCount() > table.getCapacity()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Guests count exceeds table capacity of " + table.getCapacity());
        }

        // Check Overlapping bookings for the same table, same date and time
        boolean isOverlapping = reservationRepository.checkOverlappingReservations(
                table.getId(), dto.getReservationDate(), dto.getReservationTime(), null);
        if (isOverlapping) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Table " + table.getTableNumber() + " is already booked for " + dto.getReservationDate() + " at " + dto.getReservationTime());
        }

        ReservationStatusEntity status = statusRepository.findByStatusNameIgnoreCase("CONFIRMED")
                .orElseGet(() -> statusRepository.save(ReservationStatusEntity.builder()
                        .statusName("CONFIRMED")
                        .description("Booking confirmed")
                        .build()));

        ReservationEntity reservation = ReservationEntity.builder()
                .customer(customer)
                .table(table)
                .reservationDate(dto.getReservationDate())
                .reservationTime(dto.getReservationTime())
                .guestsCount(dto.getGuestsCount())
                .specialRequests(dto.getSpecialRequests())
                .reservationStatus(status)
                .build();

        reservation = reservationRepository.save(reservation);

        // Update table status to RESERVED if today
        if (dto.getReservationDate().equals(LocalDate.now())) {
            table.setStatus("RESERVED");
            tableRepository.save(table);
        }

        return convertToDto(reservation);
    }

    @Override
    @Transactional
    public ReservationDto updateReservation(Integer id, ReservationDto dto) {
        ReservationEntity reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found with ID: " + id));

        RestaurantTableEntity table = tableRepository.findById(dto.getTableId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Table not found with ID: " + dto.getTableId()));

        if (dto.getGuestsCount() > table.getCapacity()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Guests count exceeds table capacity of " + table.getCapacity());
        }

        boolean isOverlapping = reservationRepository.checkOverlappingReservations(
                table.getId(), dto.getReservationDate(), dto.getReservationTime(), id);
        if (isOverlapping) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Table " + table.getTableNumber() + " is already booked for " + dto.getReservationDate() + " at " + dto.getReservationTime());
        }

        CustomerEntity customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found with ID: " + dto.getCustomerId()));

        reservation.setCustomer(customer);
        reservation.setTable(table);
        reservation.setReservationDate(dto.getReservationDate());
        reservation.setReservationTime(dto.getReservationTime());
        reservation.setGuestsCount(dto.getGuestsCount());
        reservation.setSpecialRequests(dto.getSpecialRequests());

        if (dto.getReservationStatusId() != null) {
            ReservationStatusEntity status = statusRepository.findById(dto.getReservationStatusId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Status not found with ID: " + dto.getReservationStatusId()));
            reservation.setReservationStatus(status);

            if ("CANCELLED".equals(status.getStatusName()) && table.getStatus().equals("RESERVED")) {
                table.setStatus("AVAILABLE");
                tableRepository.save(table);
            }
        }

        reservation = reservationRepository.save(reservation);
        return convertToDto(reservation);
    }

    @Override
    @Transactional
    public void cancelReservation(Integer id) {
        ReservationEntity reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found with ID: " + id));

        ReservationStatusEntity cancelledStatus = statusRepository.findByStatusNameIgnoreCase("CANCELLED")
                .orElseGet(() -> statusRepository.save(ReservationStatusEntity.builder()
                        .statusName("CANCELLED")
                        .description("Booking cancelled")
                        .build()));

        reservation.setReservationStatus(cancelledStatus);
        reservationRepository.save(reservation);

        if (reservation.getTable() != null && "RESERVED".equals(reservation.getTable().getStatus())) {
            RestaurantTableEntity table = reservation.getTable();
            table.setStatus("AVAILABLE");
            tableRepository.save(table);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationDto getReservationById(Integer id) {
        ReservationEntity reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found with ID: " + id));
        return convertToDto(reservation);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReservationDto> filterReservations(Integer customerId, Integer tableId, Integer statusId, LocalDate startDate, LocalDate endDate, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("reservationDate").descending());
        Page<ReservationEntity> reservations = reservationRepository.filterReservations(customerId, tableId, statusId, startDate, endDate, pageable);
        return reservations.map(this::convertToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReservationDto> getReservationsByCustomerId(Integer customerId) {
        return reservationRepository.findByCustomerId(customerId).stream()
                .map(this::convertToDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationEntity getReservationEntityById(Integer id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found with ID: " + id));
    }

    private ReservationDto convertToDto(ReservationEntity reservation) {
        ReservationDto dto = mapper.map(reservation, ReservationDto.class);
        dto.setCustomerId(reservation.getCustomer().getId());
        dto.setCustomerName(reservation.getCustomer().getName());
        dto.setCustomerPassport(reservation.getCustomer().getNicPassport());
        dto.setTableId(reservation.getTable().getId());
        dto.setTableNumber(reservation.getTable().getTableNumber());
        dto.setReservationStatusId(reservation.getReservationStatus().getId());
        dto.setReservationStatusName(reservation.getReservationStatus().getStatusName());
        return dto;
    }
}
