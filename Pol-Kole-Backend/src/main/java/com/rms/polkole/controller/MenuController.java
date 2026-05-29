package com.rms.polkole.controller;

import com.rms.polkole.dto.ApiResponse;
import com.rms.polkole.dto.MenuCategoryDto;
import com.rms.polkole.dto.MenuItemDto;
import com.rms.polkole.service.MenuService;
import com.rms.polkole.service.AuditLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/menu")
@RequiredArgsConstructor
@CrossOrigin
public class MenuController {

    private final MenuService menuService;
    private final AuditLogService auditLogService;

    // Categories
    @PostMapping("/categories")
    public ResponseEntity<ApiResponse<MenuCategoryDto>> createCategory(@Valid @RequestBody MenuCategoryDto dto) {
        MenuCategoryDto created = menuService.createCategory(dto);
        auditLogService.log("CREATE MENU CATEGORY", "Created category: " + created.getName());
        return ResponseEntity.ok(ApiResponse.success(created, "Menu category created successfully"));
    }

    @PutMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<MenuCategoryDto>> updateCategory(@PathVariable Integer id, @Valid @RequestBody MenuCategoryDto dto) {
        MenuCategoryDto updated = menuService.updateCategory(id, dto);
        auditLogService.log("UPDATE MENU CATEGORY", "Updated category name to: " + updated.getName());
        return ResponseEntity.ok(ApiResponse.success(updated, "Menu category updated successfully"));
    }

    @DeleteMapping("/categories/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable Integer id) {
        MenuCategoryDto category = menuService.getCategoryById(id);
        menuService.deleteCategory(id);
        auditLogService.log("DELETE MENU CATEGORY", "Deleted category: " + category.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "Menu category deleted successfully"));
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<MenuCategoryDto>>> getAllCategories() {
        List<MenuCategoryDto> categories = menuService.getAllCategories();
        return ResponseEntity.ok(ApiResponse.success(categories));
    }

    // Menu Items
    @PostMapping("/items")
    public ResponseEntity<ApiResponse<MenuItemDto>> createMenuItem(@Valid @RequestBody MenuItemDto dto) {
        MenuItemDto created = menuService.createMenuItem(dto);
        auditLogService.log("CREATE MENU ITEM", "Created menu item: " + created.getName() + " price: $" + created.getPrice());
        return ResponseEntity.ok(ApiResponse.success(created, "Menu item created successfully"));
    }

    @PutMapping("/items/{id}")
    public ResponseEntity<ApiResponse<MenuItemDto>> updateMenuItem(@PathVariable Integer id, @Valid @RequestBody MenuItemDto dto) {
        MenuItemDto updated = menuService.updateMenuItem(id, dto);
        auditLogService.log("UPDATE MENU ITEM", "Updated menu item: " + updated.getName());
        return ResponseEntity.ok(ApiResponse.success(updated, "Menu item updated successfully"));
    }

    @DeleteMapping("/items/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMenuItem(@PathVariable Integer id) {
        MenuItemDto item = menuService.getMenuItemById(id);
        menuService.deleteMenuItem(id);
        auditLogService.log("DELETE MENU ITEM", "Soft-deleted menu item: " + item.getName());
        return ResponseEntity.ok(ApiResponse.success(null, "Menu item deleted successfully"));
    }

    @GetMapping("/items/{id}")
    public ResponseEntity<ApiResponse<MenuItemDto>> getMenuItemById(@PathVariable Integer id) {
        MenuItemDto item = menuService.getMenuItemById(id);
        return ResponseEntity.ok(ApiResponse.success(item));
    }

    @GetMapping("/items")
    public ResponseEntity<ApiResponse<Page<MenuItemDto>>> filterMenuItems(
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) Boolean isAvailable,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size) {
        Page<MenuItemDto> items = menuService.filterMenuItems(categoryId, isAvailable, search, page, size);
        return ResponseEntity.ok(ApiResponse.success(items));
    }
}
