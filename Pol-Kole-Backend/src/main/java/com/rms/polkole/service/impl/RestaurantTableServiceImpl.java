package com.rms.polkole.service.impl;

import com.rms.polkole.dto.RestaurantTableDto;
import com.rms.polkole.entity.RestaurantTableEntity;
import com.rms.polkole.repository.RestaurantTableRepository;
import com.rms.polkole.service.RestaurantTableService;
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

@Service
@RequiredArgsConstructor
public class RestaurantTableServiceImpl implements RestaurantTableService {

    private final RestaurantTableRepository tableRepository;
    private final ModelMapper mapper;

    @Override
    @Transactional
    public RestaurantTableDto createTable(RestaurantTableDto dto) {
        if (tableRepository.findByTableNumber(dto.getTableNumber()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Table number already exists: " + dto.getTableNumber());
        }

        RestaurantTableEntity table = RestaurantTableEntity.builder()
                .tableNumber(dto.getTableNumber())
                .capacity(dto.getCapacity())
                .status(dto.getStatus())
                .location(dto.getLocation())
                .isAvailableForReservation(dto.isAvailableForReservation())
                .build();

        table = tableRepository.save(table);
        return mapper.map(table, RestaurantTableDto.class);
    }

    @Override
    @Transactional
    public RestaurantTableDto updateTable(Integer id, RestaurantTableDto dto) {
        RestaurantTableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Table not found with ID: " + id));

        tableRepository.findByTableNumber(dto.getTableNumber())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Table number already exists: " + dto.getTableNumber());
                });

        table.setTableNumber(dto.getTableNumber());
        table.setCapacity(dto.getCapacity());
        table.setStatus(dto.getStatus());
        table.setLocation(dto.getLocation());
        table.setAvailableForReservation(dto.isAvailableForReservation());

        table = tableRepository.save(table);
        return mapper.map(table, RestaurantTableDto.class);
    }

    @Override
    @Transactional
    public void deleteTable(Integer id) {
        RestaurantTableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Table not found with ID: " + id));
        tableRepository.delete(table);
    }

    @Override
    @Transactional(readOnly = true)
    public RestaurantTableDto getTableById(Integer id) {
        RestaurantTableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Table not found with ID: " + id));
        return mapper.map(table, RestaurantTableDto.class);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RestaurantTableDto> filterTables(String status, String location, Integer capacity, String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("tableNumber").ascending());
        Page<RestaurantTableEntity> tables = tableRepository.filterTables(status, location, capacity, search, pageable);
        return tables.map(t -> mapper.map(t, RestaurantTableDto.class));
    }
}
