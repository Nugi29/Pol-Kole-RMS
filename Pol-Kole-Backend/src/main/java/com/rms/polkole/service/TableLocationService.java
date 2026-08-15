package com.rms.polkole.service;

import com.rms.polkole.dto.TableLocationDto;
import java.util.List;

public interface TableLocationService {
    TableLocationDto createLocation(TableLocationDto dto);
    TableLocationDto updateLocation(Integer id, TableLocationDto dto);
    TableLocationDto getLocationById(Integer id);
    List<TableLocationDto> getAllLocations();
    void deleteLocation(Integer id);
}