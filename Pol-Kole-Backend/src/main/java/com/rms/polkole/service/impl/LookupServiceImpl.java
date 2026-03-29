package com.rms.polkole.service.impl;

import com.rms.polkole.dto.LookupDTO;
import com.rms.polkole.entity.MenuCategory;
import com.rms.polkole.entity.Userrole;
import com.rms.polkole.repository.MenuCategoryRepository;
import com.rms.polkole.repository.UserroleRepository;
import com.rms.polkole.repository.UserstatusRepository;
import com.rms.polkole.service.LookupService;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class LookupServiceImpl implements LookupService {
    private final MenuCategoryRepository menuCategoryRepository;
    private final UserroleRepository roleRepository;
    private final UserstatusRepository  userstatusRepository;
    private final ModelMapper mapper;

    @Override
    public List<LookupDTO> getAllUserRoles() {
        ArrayList<LookupDTO> dtoList = new ArrayList<>();
        roleRepository.findAll().forEach(itm -> dtoList.add(mapper.map(itm,LookupDTO.class)));
        return dtoList;
    }

    @Override
    public List<LookupDTO> getAllUserStatuses() {
        ArrayList<LookupDTO> dtoList = new ArrayList<>();
        userstatusRepository.findAll().forEach(itm -> dtoList.add(mapper.map(itm,LookupDTO.class)));
        return dtoList;
    }

    @Override
    public List<LookupDTO> getAllMenuCategories() {
        ArrayList<LookupDTO> dtoList = new ArrayList<>();
        List<MenuCategory> list = menuCategoryRepository.findAll();
        list.forEach(itm -> dtoList.add(mapper.map(itm,LookupDTO.class)));
        return dtoList;
    }
}
