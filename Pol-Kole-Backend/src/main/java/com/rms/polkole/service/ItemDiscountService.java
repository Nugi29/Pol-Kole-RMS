package com.rms.polkole.service;

import com.rms.polkole.dto.ItemDiscountDto;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.util.List;

public interface ItemDiscountService {
    ItemDiscountDto createItemDiscount(ItemDiscountDto dto);
    ItemDiscountDto updateItemDiscount(Integer id, ItemDiscountDto dto);
    void deleteItemDiscount(Integer id);
    ItemDiscountDto getItemDiscountById(Integer id);
    Page<ItemDiscountDto> searchItemDiscounts(String search, int page, int size);
    List<ItemDiscountDto> getAllActiveItemDiscounts();
    ItemDiscountDto toggleActiveStatus(Integer id);
    BigDecimal getEffectiveItemPrice(Integer menuItemId);
}
