package com.rms.polkole.service.impl;

import com.rms.polkole.dto.RestaurantTableDto;
import com.rms.polkole.entity.RestaurantTableEntity;
import com.rms.polkole.entity.TableLocationEntity;
import com.rms.polkole.repository.RestaurantTableRepository;
import com.rms.polkole.repository.TableLocationRepository;
import com.rms.polkole.service.RestaurantTableService;
import com.rms.polkole.service.CodeGeneratorService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import javax.sql.DataSource;
import java.sql.Connection;

@Service
@RequiredArgsConstructor
public class RestaurantTableServiceImpl implements RestaurantTableService {

    private static final String TABLE_NOT_FOUND_PREFIX = "Table not found with ID: ";

    private final RestaurantTableRepository tableRepository;
    private final TableLocationRepository locationRepository;
    private final CodeGeneratorService codeGeneratorService;
    private final ModelMapper mapper;
    private final DataSource dataSource;

    @PersistenceContext
    private final EntityManager entityManager;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    @SuppressWarnings({"SqlResolve", "SqlNoDataSourceInspection"})
    public void migrateOldLocations() {
        if (!isMySqlDatabase()) {
            return;
        }

        try {
            // Check if column 'location' exists in 'restaurant_tables' table in current database
            String checkQuery = "SELECT COUNT(*) FROM information_schema.columns " +
                               "WHERE table_schema = DATABASE() " +
                               "AND table_name = 'restaurant_tables' " +
                               "AND column_name = 'location'";
            Number count = (Number) entityManager.createNativeQuery(checkQuery).getSingleResult();
            if (count != null && count.intValue() > 0) {
                entityManager.createNativeQuery(
                    "UPDATE restaurant_tables t " +
                    "JOIN table_locations l ON t.location = l.name " +
                    "SET t.location_id = l.id " +
                    "WHERE t.location_id IS NULL AND t.location IS NOT NULL"
                ).executeUpdate();
            }
        } catch (Exception e) {
            // Ignore any issues
        }
    }

    private boolean isMySqlDatabase() {
        try (Connection connection = dataSource.getConnection()) {
            String productName = connection.getMetaData().getDatabaseProductName();
            return productName != null && productName.toLowerCase().contains("mysql");
        } catch (Exception ignored) {
            return false;
        }
    }

    private RestaurantTableDto convertToDto(RestaurantTableEntity table) {
        RestaurantTableDto dto = mapper.map(table, RestaurantTableDto.class);
        if (table.getLocation() != null) {
            dto.setLocationId(table.getLocation().getId());
            dto.setLocationName(table.getLocation().getName());
            dto.setLocationCode(table.getLocation().getCode());
        }
        return dto;
    }

    @Override
    @Transactional
    public RestaurantTableDto createTable(RestaurantTableDto dto) {
        if (dto.getLocationId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Location ID is required");
        }
        TableLocationEntity location = locationRepository.findById(dto.getLocationId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected location does not exist"));
        if (!location.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected location is not active");
        }

        String tableNumber = codeGeneratorService.generateNextTableNumber(String.valueOf(location.getId()));
        if (tableRepository.countByTableNumberIncludingDeleted(tableNumber) > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Generated table number already exists: " + tableNumber);
        }

        RestaurantTableEntity table = RestaurantTableEntity.builder()
                .tableNumber(tableNumber)
                .capacity(dto.getCapacity())
                .status(dto.getStatus())
                .location(location)
                .isAvailableForReservation(dto.isAvailableForReservation())
                .build();

        table = tableRepository.save(table);
        return convertToDto(table);
    }

    @Override
    @Transactional
    public RestaurantTableDto updateTable(Integer id, RestaurantTableDto dto) {
        RestaurantTableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, TABLE_NOT_FOUND_PREFIX + id));

        if (dto.getLocationId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Location ID is required");
        }
        TableLocationEntity location = locationRepository.findById(dto.getLocationId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected location does not exist"));
        if (!location.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selected location is not active");
        }

        if (table.getLocation() == null || !table.getLocation().getId().equals(location.getId())) {
            String tableNumber = codeGeneratorService.generateNextTableNumber(String.valueOf(location.getId()));
            if (tableRepository.countByTableNumberIncludingDeleted(tableNumber) > 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Generated table number already exists: " + tableNumber);
            }
            table.setTableNumber(tableNumber);
        }

        table.setCapacity(dto.getCapacity());
        table.setStatus(dto.getStatus());
        table.setLocation(location);
        table.setAvailableForReservation(dto.isAvailableForReservation());

        table = tableRepository.save(table);
        return convertToDto(table);
    }

    @Override
    @Transactional
    public void deleteTable(Integer id) {
        RestaurantTableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, TABLE_NOT_FOUND_PREFIX + id));
        tableRepository.delete(table);
    }

    @Override
    @Transactional(readOnly = true)
    public RestaurantTableDto getTableById(Integer id) {
        RestaurantTableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, TABLE_NOT_FOUND_PREFIX + id));
        return convertToDto(table);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RestaurantTableDto> filterTables(String status, String location, Integer capacity, String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("tableNumber").ascending());
        Page<RestaurantTableEntity> tables = tableRepository.filterTables(status, location, capacity, search, pageable);
        return tables.map(this::convertToDto);
    }
}