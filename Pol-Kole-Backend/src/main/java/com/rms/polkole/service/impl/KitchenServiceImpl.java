package com.rms.polkole.service.impl;

import com.rms.polkole.dto.KitchenOrderDto;
import com.rms.polkole.dto.OrderItemDto;
import com.rms.polkole.entity.KitchenOrderEntity;
import com.rms.polkole.repository.KitchenOrderRepository;
import com.rms.polkole.service.KitchenService;
import com.rms.polkole.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class KitchenServiceImpl implements KitchenService {

    private final KitchenOrderRepository kitchenOrderRepository;
    private final OrderService orderService;
    private final ModelMapper mapper;

    @Override
    @Transactional
    public KitchenOrderDto updatePreparationStatus(Integer id, String statusName) {
        KitchenOrderEntity kOrder = kitchenOrderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kitchen order not found with ID: " + id));

        kOrder.setPreparationStatus(statusName);
        if ("PREPARING".equals(statusName)) {
            kOrder.setStartTime(Instant.now());
            orderService.updateOrderStatus(kOrder.getOrder().getId(), "PREPARING");
        } else if ("READY".equals(statusName)) {
            kOrder.setEndTime(Instant.now());
            orderService.updateOrderStatus(kOrder.getOrder().getId(), "READY");
        } else if ("DELIVERED".equals(statusName)) {
            orderService.updateOrderStatus(kOrder.getOrder().getId(), "SERVED");
        }

        kOrder = kitchenOrderRepository.save(kOrder);
        return mapToDto(kOrder);
    }

    @Override
    @Transactional(readOnly = true)
    public KitchenOrderDto getKitchenOrderById(Integer id) {
        KitchenOrderEntity kOrder = kitchenOrderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kitchen order not found with ID: " + id));
        return mapToDto(kOrder);
    }

    @Override
    @Transactional(readOnly = true)
    public List<KitchenOrderDto> getActiveKitchenOrders() {
        return kitchenOrderRepository.findActiveKitchenOrders().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<KitchenOrderDto> getKitchenOrdersByStatus(String status) {
        return kitchenOrderRepository.findByPreparationStatus(status).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<KitchenOrderDto> getServedKitchenOrders() {
        return kitchenOrderRepository.findServedKitchenOrders().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private KitchenOrderDto mapToDto(KitchenOrderEntity kOrder) {
        KitchenOrderDto dto = KitchenOrderDto.builder()
                .id(kOrder.getId())
                .orderId(kOrder.getOrder().getId())
                .notes(kOrder.getOrder().getNotes())
                .preparationStatus(kOrder.getPreparationStatus())
                .preparationTimer(kOrder.getPreparationTimer())
                .startTime(kOrder.getStartTime())
                .endTime(kOrder.getEndTime())
                .build();

        if (kOrder.getOrder().getTable() != null) {
            dto.setTableNumber(kOrder.getOrder().getTable().getTableNumber());
        }

        if (kOrder.getOrder().getRoom() != null) {
            dto.setRoomNumber(kOrder.getOrder().getRoom().getRoomNumber());
        }

        if (kOrder.getAssignedChef() != null) {
            dto.setAssignedChefId(kOrder.getAssignedChef().getId());
            dto.setAssignedChefName(kOrder.getAssignedChef().getName());
        }

        if (kOrder.getOrder().getCustomer() != null) {
            dto.setCustomerName(kOrder.getOrder().getCustomer().getName());
        }

        dto.setItems(kOrder.getOrder().getItems().stream().map(item -> {
            OrderItemDto itemDto = mapper.map(item, OrderItemDto.class);
            itemDto.setMenuItemId(item.getMenuItem().getId());
            itemDto.setMenuItemName(item.getMenuItem().getName());
            return itemDto;
        }).collect(Collectors.toList()));

        return dto;
    }
}
