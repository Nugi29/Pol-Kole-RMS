package com.rms.polkole.service.impl;

import com.rms.polkole.dto.Lookup;
import com.rms.polkole.entity.MenuCategoryEntity;
import com.rms.polkole.entity.UserroleEntity;
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
    public List<Lookup> getAllUserRoles() {
        ArrayList<Lookup> dtoList = new ArrayList<>();
        roleRepository.findAll().forEach(itm -> dtoList.add(mapper.map(itm,Lookup.class)));
        return dtoList;
    }

    @Override
    public List<Lookup> getAllUserStatuses() {
        ArrayList<Lookup> dtoList = new ArrayList<>();
        userstatusRepository.findAll().forEach(itm -> dtoList.add(mapper.map(itm,Lookup.class)));
        return dtoList;
    }

    @Override
    public List<Lookup> getAllMenuCategories() {
        ArrayList<Lookup> dtoList = new ArrayList<>();
        List<MenuCategoryEntity> list = menuCategoryRepository.findAll();
        list.forEach(itm -> dtoList.add(mapper.map(itm,Lookup.class)));
        return dtoList;
    }
}

