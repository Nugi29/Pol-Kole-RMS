package com.rms.polkole.service;

import com.rms.polkole.dto.RestaurantTableDto;
import org.springframework.data.domain.Page;

public interface RestaurantTableService {
    RestaurantTableDto createTable(RestaurantTableDto dto);
    RestaurantTableDto updateTable(Integer id, RestaurantTableDto dto);
    void deleteTable(Integer id);
    RestaurantTableDto getTableById(Integer id);
    Page<RestaurantTableDto> filterTables(String status, String location, Integer capacity, String search, int page, int size);
}
