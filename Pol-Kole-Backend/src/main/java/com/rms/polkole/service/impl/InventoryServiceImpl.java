package com.rms.polkole.service.impl;

import com.rms.polkole.dto.InventoryItemDto;
import com.rms.polkole.dto.StockTransactionDto;
import com.rms.polkole.entity.InventoryItemEntity;
import com.rms.polkole.entity.StockTransactionEntity;
import com.rms.polkole.repository.InventoryItemRepository;
import com.rms.polkole.repository.StockTransactionRepository;
import com.rms.polkole.service.InventoryService;
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
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryServiceImpl implements InventoryService {

    private final InventoryItemRepository itemRepository;
    private final StockTransactionRepository transactionRepository;
    private final ModelMapper mapper;

    @Override
    @Transactional
    public InventoryItemDto createItem(InventoryItemDto dto) {
        if (itemRepository.findByItemName(dto.getItemName()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Inventory item already exists: " + dto.getItemName());
        }

        InventoryItemEntity item = InventoryItemEntity.builder()
                .itemName(dto.getItemName())
                .quantity(dto.getQuantity())
                .unit(dto.getUnit())
                .supplier(dto.getSupplier())
                .expiryDate(dto.getExpiryDate())
                .minimumStockLevel(dto.getMinimumStockLevel())
                .build();

        item = itemRepository.save(item);
        return mapper.map(item, InventoryItemDto.class);
    }

    @Override
    @Transactional
    public InventoryItemDto updateItem(Integer id, InventoryItemDto dto) {
        InventoryItemEntity item = itemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inventory item not found with ID: " + id));

        itemRepository.findByItemName(dto.getItemName())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Inventory item already exists: " + dto.getItemName());
                });

        item.setItemName(dto.getItemName());
        item.setQuantity(dto.getQuantity());
        item.setUnit(dto.getUnit());
        item.setSupplier(dto.getSupplier());
        item.setExpiryDate(dto.getExpiryDate());
        item.setMinimumStockLevel(dto.getMinimumStockLevel());

        item = itemRepository.save(item);
        return mapper.map(item, InventoryItemDto.class);
    }

    @Override
    @Transactional
    public void deleteItem(Integer id) {
        InventoryItemEntity item = itemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inventory item not found with ID: " + id));
        itemRepository.delete(item);
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryItemDto getItemById(Integer id) {
        InventoryItemEntity item = itemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inventory item not found with ID: " + id));
        return mapper.map(item, InventoryItemDto.class);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<InventoryItemDto> filterInventory(String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("itemName").ascending());
        Page<InventoryItemEntity> items = itemRepository.filterInventory(search, pageable);
        return items.map(i -> mapper.map(i, InventoryItemDto.class));
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryItemDto> getLowStockItems() {
        return itemRepository.findLowStockItems().stream()
                .map(i -> mapper.map(i, InventoryItemDto.class))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public StockTransactionDto addStock(Integer itemId, BigDecimal quantity, String reason) {
        InventoryItemEntity item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inventory item not found with ID: " + itemId));

        item.setQuantity(item.getQuantity().add(quantity));
        item = itemRepository.save(item);

        StockTransactionEntity tx = StockTransactionEntity.builder()
                .inventoryItem(item)
                .transactionType("IN")
                .quantity(quantity)
                .reason(reason)
                .transactionTime(Instant.now())
                .build();

        tx = transactionRepository.save(tx);
        return mapTxToDto(tx);
    }

    @Override
    @Transactional
    public StockTransactionDto deductStock(Integer itemId, BigDecimal quantity, String reason) {
        InventoryItemEntity item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Inventory item not found with ID: " + itemId));

        if (item.getQuantity().compareTo(quantity) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient stock quantity for: " + item.getItemName());
        }

        item.setQuantity(item.getQuantity().subtract(quantity));
        item = itemRepository.save(item);

        StockTransactionEntity tx = StockTransactionEntity.builder()
                .inventoryItem(item)
                .transactionType("OUT")
                .quantity(quantity)
                .reason(reason)
                .transactionTime(Instant.now())
                .build();

        tx = transactionRepository.save(tx);
        return mapTxToDto(tx);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<StockTransactionDto> getTransactionHistory(Integer itemId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<StockTransactionEntity> txs = transactionRepository.findByInventoryItemIdOrderByTransactionTimeDesc(itemId, pageable);
        return txs.map(this::mapTxToDto);
    }

    private StockTransactionDto mapTxToDto(StockTransactionEntity tx) {
        StockTransactionDto dto = mapper.map(tx, StockTransactionDto.class);
        dto.setInventoryItemId(tx.getInventoryItem().getId());
        dto.setInventoryItemName(tx.getInventoryItem().getItemName());
        return dto;
    }
}
