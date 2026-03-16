package com.rms.polkole.service.impl;

import com.rms.polkole.dto.MenuCategoryDTO;
import com.rms.polkole.entity.MenuCategory;
import com.rms.polkole.repository.MenuCategoryRepository;
import com.rms.polkole.service.MenuCategoryService;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MenuCategoryServiceImpl implements MenuCategoryService {
    private final MenuCategoryRepository menuCategoryRepository;
    private final ModelMapper mapper;


    @Override
    public List<MenuCategoryDTO> getAllMenuCategories() {
        ArrayList<MenuCategoryDTO> dtoList = new ArrayList<>();
        List<MenuCategory> catList = menuCategoryRepository.findAll();
        catList.forEach(cat -> dtoList.add(mapper.map(cat, MenuCategoryDTO.class)));

        return dtoList;
    }
}
