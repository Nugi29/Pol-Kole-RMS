package com.rms.polkole.service;

import com.rms.polkole.dto.RoomDto;
import com.rms.polkole.dto.RoomTypeDto;
import org.springframework.data.domain.Page;
import java.util.List;

public interface RoomService {
    RoomDto createRoom(RoomDto dto);
    RoomDto updateRoom(Integer id, RoomDto dto);
    RoomDto getRoomById(Integer id);
    Page<RoomDto> filterRooms(String status, Integer capacity, int page, int size);
    void deleteRoom(Integer id);
    
    // Room Types
    RoomTypeDto createRoomType(RoomTypeDto dto);
    List<RoomTypeDto> getAllRoomTypes();
}
