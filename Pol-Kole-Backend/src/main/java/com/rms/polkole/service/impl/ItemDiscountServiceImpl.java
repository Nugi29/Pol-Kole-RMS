package com.rms.polkole.service.impl;

import com.rms.polkole.dto.ItemDiscountDto;
import com.rms.polkole.entity.ItemDiscountEntity;
import com.rms.polkole.entity.MenuItemEntity;
import com.rms.polkole.repository.ItemDiscountRepository;
import com.rms.polkole.repository.MenuItemRepository;
import com.rms.polkole.service.ItemDiscountService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ItemDiscountServiceImpl implements ItemDiscountService {

    private final ItemDiscountRepository itemDiscountRepository;
    private final MenuItemRepository menuItemRepository;

    @Override
    @Transactional
    public ItemDiscountDto createItemDiscount(ItemDiscountDto dto) {
        MenuItemEntity menuItem = menuItemRepository.findById(dto.getMenuItemId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Menu Item not found with ID: " + dto.getMenuItemId()));

        if (dto.getEndDate().isBefore(dto.getStartDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date cannot be before start date");
        }

        ItemDiscountEntity entity = ItemDiscountEntity.builder()
                .title(dto.getTitle().trim())
                .menuItem(menuItem)
                .discountType(dto.getDiscountType().toUpperCase())
                .discountValue(dto.getDiscountValue())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();

        entity = itemDiscountRepository.save(entity);
        return mapToDto(entity);
    }

    @Override
    @Transactional
    public ItemDiscountDto updateItemDiscount(Integer id, ItemDiscountDto dto) {
        ItemDiscountEntity entity = itemDiscountRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item Discount not found with ID: " + id));

        MenuItemEntity menuItem = menuItemRepository.findById(dto.getMenuItemId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Menu Item not found with ID: " + dto.getMenuItemId()));

        if (dto.getEndDate().isBefore(dto.getStartDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date cannot be before start date");
        }

        entity.setTitle(dto.getTitle().trim());
        entity.setMenuItem(menuItem);
        entity.setDiscountType(dto.getDiscountType().toUpperCase());
        entity.setDiscountValue(dto.getDiscountValue());
        entity.setStartDate(dto.getStartDate());
        entity.setEndDate(dto.getEndDate());
        if (dto.getIsActive() != null) {
            entity.setActive(dto.getIsActive());
        }

        entity = itemDiscountRepository.save(entity);
        return mapToDto(entity);
    }

    @Override
    @Transactional
    public void deleteItemDiscount(Integer id) {
        ItemDiscountEntity entity = itemDiscountRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item Discount not found with ID: " + id));
        itemDiscountRepository.delete(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public ItemDiscountDto getItemDiscountById(Integer id) {
        ItemDiscountEntity entity = itemDiscountRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item Discount not found with ID: " + id));
        return mapToDto(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ItemDiscountDto> searchItemDiscounts(String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        Page<ItemDiscountEntity> discounts = itemDiscountRepository.searchItemDiscounts(search, pageable);
        return discounts.map(this::mapToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ItemDiscountDto> getAllActiveItemDiscounts() {
        LocalDate today = LocalDate.now();
        List<ItemDiscountEntity> activeList = itemDiscountRepository.findAllActiveDiscounts(today);
        return activeList.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ItemDiscountDto toggleActiveStatus(Integer id) {
        ItemDiscountEntity entity = itemDiscountRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item Discount not found with ID: " + id));
        entity.setActive(!entity.isActive());
        entity = itemDiscountRepository.save(entity);
        return mapToDto(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public BigDecimal getEffectiveItemPrice(Integer menuItemId) {
        MenuItemEntity menuItem = menuItemRepository.findById(menuItemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Menu Item not found with ID: " + menuItemId));

        LocalDate today = LocalDate.now();
        List<ItemDiscountEntity> activeDiscounts = itemDiscountRepository.findActiveDiscountsForItem(menuItemId, today);
        if (activeDiscounts.isEmpty()) {
            return menuItem.getPrice();
        }

        ItemDiscountEntity bestDiscount = activeDiscounts.get(0);
        return calculateDiscountedPrice(menuItem.getPrice(), bestDiscount.getDiscountType(), bestDiscount.getDiscountValue());
    }

    private BigDecimal calculateDiscountedPrice(BigDecimal originalPrice, String discountType, BigDecimal discountValue) {
        if (originalPrice == null || discountValue == null) return originalPrice;

        BigDecimal finalPrice = originalPrice;
        if ("PERCENTAGE".equalsIgnoreCase(discountType)) {
            BigDecimal deduction = originalPrice.multiply(discountValue).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            finalPrice = originalPrice.subtract(deduction);
        } else if ("FIXED_OFF".equalsIgnoreCase(discountType)) {
            finalPrice = originalPrice.subtract(discountValue);
        } else if ("SPECIAL_PRICE".equalsIgnoreCase(discountType)) {
            finalPrice = discountValue;
        }

        if (finalPrice.compareTo(BigDecimal.ZERO) < 0) {
            finalPrice = BigDecimal.ZERO;
        }
        return finalPrice;
    }

    private ItemDiscountDto mapToDto(ItemDiscountEntity entity) {
        LocalDate today = LocalDate.now();
        String status = "ACTIVE";
        if (!entity.isActive()) {
            status = "PAUSED";
        } else if (today.isAfter(entity.getEndDate())) {
            status = "EXPIRED";
        } else if (today.isBefore(entity.getStartDate())) {
            status = "SCHEDULED";
        }

        BigDecimal originalPrice = entity.getMenuItem() != null ? entity.getMenuItem().getPrice() : BigDecimal.ZERO;
        BigDecimal calculated = calculateDiscountedPrice(originalPrice, entity.getDiscountType(), entity.getDiscountValue());

        return ItemDiscountDto.builder()
                .id(entity.getId())
                .title(entity.getTitle())
                .menuItemId(entity.getMenuItem() != null ? entity.getMenuItem().getId() : null)
                .menuItemName(entity.getMenuItem() != null ? entity.getMenuItem().getName() : "")
                .menuItemOriginalPrice(originalPrice)
                .discountType(entity.getDiscountType())
                .discountValue(entity.getDiscountValue())
                .calculatedDiscountedPrice(calculated)
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .isActive(entity.isActive())
                .status(status)
                .build();
    }
}
