package com.rms.polkole.service.impl;

import com.rms.polkole.dto.MenuCategoryDto;
import com.rms.polkole.dto.MenuItemDto;
import com.rms.polkole.entity.MenuCategoryEntity;
import com.rms.polkole.entity.MenuItemEntity;
import com.rms.polkole.repository.MenuCategoryRepository;
import com.rms.polkole.repository.MenuItemRepository;
import com.rms.polkole.service.MenuService;
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
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MenuServiceImpl implements MenuService {

    private final MenuCategoryRepository categoryRepository;
    private final MenuItemRepository menuItemRepository;
    private final ModelMapper mapper;

    @Override
    @Transactional
    public MenuCategoryDto createCategory(MenuCategoryDto dto) {
        if (categoryRepository.findByName(dto.getName()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Category already exists: " + dto.getName());
        }

        MenuCategoryEntity category = MenuCategoryEntity.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .build();

        category = categoryRepository.save(category);
        return mapper.map(category, MenuCategoryDto.class);
    }

    @Override
    @Transactional
    public MenuCategoryDto updateCategory(Integer id, MenuCategoryDto dto) {
        MenuCategoryEntity category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found with ID: " + id));

        categoryRepository.findByName(dto.getName())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Category already exists: " + dto.getName());
                });

        category.setName(dto.getName());
        category.setDescription(dto.getDescription());

        category = categoryRepository.save(category);
        return mapper.map(category, MenuCategoryDto.class);
    }

    @Override
    @Transactional
    public void deleteCategory(Integer id) {
        MenuCategoryEntity category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found with ID: " + id));
        categoryRepository.delete(category);
    }

    @Override
    @Transactional(readOnly = true)
    public MenuCategoryDto getCategoryById(Integer id) {
        MenuCategoryEntity category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found with ID: " + id));
        return mapper.map(category, MenuCategoryDto.class);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MenuCategoryDto> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(c -> mapper.map(c, MenuCategoryDto.class))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public MenuItemDto createMenuItem(MenuItemDto dto) {
        MenuCategoryEntity category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found with ID: " + dto.getCategoryId()));

        MenuItemEntity item = MenuItemEntity.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .price(dto.getPrice())
                .category(category)
                .isAvailable(dto.isAvailable())
                .preparationTime(dto.getPreparationTime())
                .imageUrl(dto.getImageUrl())
                .build();

        item = menuItemRepository.save(item);
        return mapToDto(item);
    }

    @Override
    @Transactional
    public MenuItemDto updateMenuItem(Integer id, MenuItemDto dto) {
        MenuItemEntity item = menuItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Menu item not found with ID: " + id));

        MenuCategoryEntity category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found with ID: " + dto.getCategoryId()));

        item.setName(dto.getName());
        item.setDescription(dto.getDescription());
        item.setPrice(dto.getPrice());
        item.setCategory(category);
        item.setAvailable(dto.isAvailable());
        item.setPreparationTime(dto.getPreparationTime());
        item.setImageUrl(dto.getImageUrl());

        item = menuItemRepository.save(item);
        return mapToDto(item);
    }

    @Override
    @Transactional
    public void deleteMenuItem(Integer id) {
        MenuItemEntity item = menuItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Menu item not found with ID: " + id));
        menuItemRepository.delete(item);
    }

    @Override
    @Transactional(readOnly = true)
    public MenuItemDto getMenuItemById(Integer id) {
        MenuItemEntity item = menuItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Menu item not found with ID: " + id));
        return mapToDto(item);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<MenuItemDto> filterMenuItems(Integer categoryId, Boolean isAvailable, String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("name").ascending());
        Page<MenuItemEntity> items = menuItemRepository.filterMenuItems(categoryId, isAvailable, search, pageable);
        return items.map(this::mapToDto);
    }

    private MenuItemDto mapToDto(MenuItemEntity item) {
        MenuItemDto dto = mapper.map(item, MenuItemDto.class);
        dto.setCategoryId(item.getCategory().getId());
        dto.setCategoryName(item.getCategory().getName());
        return dto;
    }
}
