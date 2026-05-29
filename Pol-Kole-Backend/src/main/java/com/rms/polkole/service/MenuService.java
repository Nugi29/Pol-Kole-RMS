package com.rms.polkole.service;

import com.rms.polkole.dto.MenuCategoryDto;
import com.rms.polkole.dto.MenuItemDto;
import org.springframework.data.domain.Page;
import java.util.List;

public interface MenuService {
    // Menu Categories
    MenuCategoryDto createCategory(MenuCategoryDto dto);
    MenuCategoryDto updateCategory(Integer id, MenuCategoryDto dto);
    void deleteCategory(Integer id);
    MenuCategoryDto getCategoryById(Integer id);
    List<MenuCategoryDto> getAllCategories();

    // Menu Items
    MenuItemDto createMenuItem(MenuItemDto dto);
    MenuItemDto updateMenuItem(Integer id, MenuItemDto dto);
    void deleteMenuItem(Integer id);
    MenuItemDto getMenuItemById(Integer id);
    Page<MenuItemDto> filterMenuItems(Integer categoryId, Boolean isAvailable, String search, int page, int size);
}
