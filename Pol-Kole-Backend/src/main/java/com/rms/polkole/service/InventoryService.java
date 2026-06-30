package com.rms.polkole.service;

import com.rms.polkole.dto.InventoryItemDto;
import com.rms.polkole.dto.StockTransactionDto;
import org.springframework.data.domain.Page;
import java.math.BigDecimal;
import java.util.List;

public interface InventoryService {
    InventoryItemDto createItem(InventoryItemDto dto);
    InventoryItemDto updateItem(Integer id, InventoryItemDto dto);
    void deleteItem(Integer id);
    InventoryItemDto getItemById(Integer id);
    Page<InventoryItemDto> filterInventory(String search, int page, int size);
    List<InventoryItemDto> getLowStockItems();

    // Transactions
    StockTransactionDto addStock(Integer itemId, BigDecimal quantity, String reason);
    StockTransactionDto deductStock(Integer itemId, BigDecimal quantity, String reason);
    Page<StockTransactionDto> getTransactionHistory(Integer itemId, int page, int size);
}
