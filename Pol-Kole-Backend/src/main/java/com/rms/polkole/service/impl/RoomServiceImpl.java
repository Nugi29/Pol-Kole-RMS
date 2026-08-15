package com.rms.polkole.service.impl;

import com.rms.polkole.dto.RoomDto;
import com.rms.polkole.dto.RoomTypeDto;
import com.rms.polkole.entity.RoomEntity;
import com.rms.polkole.entity.RoomTypeEntity;
import com.rms.polkole.repository.RoomRepository;
import com.rms.polkole.repository.RoomTypeRepository;
import com.rms.polkole.service.RoomService;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final ModelMapper mapper;

    @Override
    @Transactional
    public RoomDto createRoom(RoomDto dto) {
        RoomTypeEntity type = roomTypeRepository.findById(dto.getRoomTypeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room type not found"));

        RoomEntity room = RoomEntity.builder()
                .roomNumber(dto.getRoomNumber())
                .roomType(type)
                .status(dto.getStatus() != null ? dto.getStatus() : "AVAILABLE")
                .capacity(dto.getCapacity())
                .build();

        room = roomRepository.save(room);
        return convertToDto(room);
    }

    @Override
    @Transactional
    public RoomDto updateRoom(Integer id, RoomDto dto) {
        RoomEntity room = roomRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        RoomTypeEntity type = roomTypeRepository.findById(dto.getRoomTypeId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room type not found"));

        room.setRoomNumber(dto.getRoomNumber());
        room.setRoomType(type);
        room.setStatus(dto.getStatus());
        room.setCapacity(dto.getCapacity());

        room = roomRepository.save(room);
        return convertToDto(room);
    }

    @Override
    @Transactional(readOnly = true)
    public RoomDto getRoomById(Integer id) {
        RoomEntity room = roomRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
        return convertToDto(room);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RoomDto> filterRooms(String status, Integer capacity, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<RoomEntity> rooms = roomRepository.filterRooms(status, capacity, pageable);
        return rooms.map(this::convertToDto);
    }

    @Override
    @Transactional
    public void deleteRoom(Integer id) {
        RoomEntity room = roomRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
        room.setDeleted(true);
        roomRepository.save(room);
    }

    @Override
    @Transactional
    public RoomTypeDto createRoomType(RoomTypeDto dto) {
        RoomTypeEntity type = RoomTypeEntity.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .maxCapacity(dto.getMaxCapacity())
                .defaultPrice(dto.getDefaultPrice())
                .amenities(dto.getAmenities())
                .build();
        type = roomTypeRepository.save(type);
        return mapper.map(type, RoomTypeDto.class);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeDto> getAllRoomTypes() {
        return roomTypeRepository.findAll().stream()
                .map(type -> mapper.map(type, RoomTypeDto.class))
                .toList();
    }

    @Override
    @Transactional
    public RoomTypeDto updateRoomType(Integer id, RoomTypeDto dto) {
        RoomTypeEntity type = roomTypeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room type not found"));

        type.setName(dto.getName());
        type.setDescription(dto.getDescription());
        type.setMaxCapacity(dto.getMaxCapacity());
        type.setDefaultPrice(dto.getDefaultPrice());
        type.setAmenities(dto.getAmenities());

        type = roomTypeRepository.save(type);
        return mapper.map(type, RoomTypeDto.class);
    }

    @Override
    @Transactional
    public void deleteRoomType(Integer id) {
        RoomTypeEntity type = roomTypeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room type not found"));
        
        long activeRoomsCount = roomRepository.findAll().stream()
                .filter(r -> !r.isDeleted() && r.getRoomType().getId().equals(id))
                .count();
        if (activeRoomsCount > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete room category because it is assigned to " + activeRoomsCount + " room(s).");
        }

        roomTypeRepository.delete(type);
    }

    private RoomDto convertToDto(RoomEntity room) {
        RoomDto dto = mapper.map(room, RoomDto.class);
        dto.setRoomTypeId(room.getRoomType().getId());
        dto.setRoomTypeName(room.getRoomType().getName());
        return dto;
    }
}
