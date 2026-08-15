package com.rms.polkole.service.impl;

import com.rms.polkole.dto.TableLocationDto;
import com.rms.polkole.entity.TableLocationEntity;
import com.rms.polkole.repository.TableLocationRepository;
import com.rms.polkole.service.TableLocationService;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TableLocationServiceImpl implements TableLocationService {

    private final TableLocationRepository locationRepository;
    private final ModelMapper mapper;

    @Override
    @Transactional
    public TableLocationDto createLocation(TableLocationDto dto) {
        if (locationRepository.findByName(dto.getName()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Location name already exists: " + dto.getName());
        }
        if (locationRepository.findByCode(dto.getCode()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Location code already exists: " + dto.getCode());
        }

        TableLocationEntity entity = TableLocationEntity.builder()
                .name(dto.getName())
                .code(dto.getCode())
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();

        entity = locationRepository.save(entity);
        return mapper.map(entity, TableLocationDto.class);
    }

    @Override
    @Transactional
    public TableLocationDto updateLocation(Integer id, TableLocationDto dto) {
        TableLocationEntity entity = locationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Location not found with ID: " + id));

        locationRepository.findByName(dto.getName())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Location name already exists: " + dto.getName());
                });

        locationRepository.findByCode(dto.getCode())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Location code already exists: " + dto.getCode());
                });

        entity.setName(dto.getName());
        entity.setCode(dto.getCode());
        if (dto.getIsActive() != null) {
            entity.setActive(dto.getIsActive());
        }

        entity = locationRepository.save(entity);
        return mapper.map(entity, TableLocationDto.class);
    }

    @Override
    @Transactional(readOnly = true)
    public TableLocationDto getLocationById(Integer id) {
        TableLocationEntity entity = locationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Location not found with ID: " + id));
        return mapper.map(entity, TableLocationDto.class);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TableLocationDto> getAllLocations() {
        return locationRepository.findAll().stream()
                .map(entity -> mapper.map(entity, TableLocationDto.class))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteLocation(Integer id) {
        TableLocationEntity entity = locationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Location not found with ID: " + id));
        entity.setActive(false);
        locationRepository.save(entity);
    }
}