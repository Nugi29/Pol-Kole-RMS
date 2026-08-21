package com.rms.polkole.service.impl;

import com.rms.polkole.dto.OrderDto;
import com.rms.polkole.dto.OrderItemDto;
import com.rms.polkole.entity.*;
import com.rms.polkole.repository.*;
import com.rms.polkole.service.OrderService;
import com.rms.polkole.service.ItemDiscountService;
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
import java.util.LinkedHashSet;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final OrderStatusRepository statusRepository;
    private final RestaurantTableRepository tableRepository;
    private final CustomerRepository customerRepository;
    private final MenuItemRepository menuItemRepository;
    private final KitchenOrderRepository kitchenOrderRepository;
    private final RoomRepository roomRepository;
    private final ModelMapper mapper;
    private final ItemDiscountService itemDiscountService;

    @Override
    @Transactional
    public OrderDto createOrder(OrderDto dto) {
        OrderStatusEntity initialStatus = statusRepository.findByName("PENDING")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Initial Order Status 'PENDING' not found."));

        RestaurantTableEntity table = null;
        if (dto.getTableId() != null) {
            table = tableRepository.findById(dto.getTableId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Table not found with ID: " + dto.getTableId()));
            table.setStatus("OCCUPIED");
            tableRepository.save(table);
        }

        RoomEntity room = null;
        if (dto.getRoomId() != null) {
            room = roomRepository.findById(dto.getRoomId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found with ID: " + dto.getRoomId()));
        }

        CustomerEntity customer = null;
        if (dto.getCustomerId() != null) {
            customer = customerRepository.findById(dto.getCustomerId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found with ID: " + dto.getCustomerId()));
        }

        OrderEntity order = OrderEntity.builder()
                .table(table)
                .room(room)
                .customer(customer)
                .status(initialStatus)
                .orderTime(Instant.now())
                .notes(dto.getNotes())
                .totalAmount(BigDecimal.ZERO)
                .items(new LinkedHashSet<>())
                .build();

        BigDecimal subtotal = BigDecimal.ZERO;
        for (OrderItemDto itemDto : dto.getItems()) {
            MenuItemEntity menuItem = menuItemRepository.findById(itemDto.getMenuItemId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Menu item not found with ID: " + itemDto.getMenuItemId()));

            BigDecimal effectivePrice = itemDiscountService.getEffectiveItemPrice(menuItem.getId());
            if (effectivePrice == null) {
                effectivePrice = menuItem.getPrice();
            }

            OrderItemEntity item = OrderItemEntity.builder()
                    .order(order)
                    .menuItem(menuItem)
                    .quantity(itemDto.getQuantity())
                    .price(effectivePrice)
                    .notes(itemDto.getNotes())
                    .build();

            order.getItems().add(item);
            subtotal = subtotal.add(effectivePrice.multiply(BigDecimal.valueOf(itemDto.getQuantity())));
        }

        order.setTotalAmount(subtotal);
        order = orderRepository.save(order);

        // Auto-create Kitchen Order Ticket
        KitchenOrderEntity kitchenOrder = KitchenOrderEntity.builder()
                .order(order)
                .preparationStatus("RECEIVED")
                .preparationTimer(15) // default estimate
                .startTime(Instant.now())
                .build();
        kitchenOrderRepository.save(kitchenOrder);

        return mapToDto(order);
    }

    @Override
    @Transactional
    public OrderDto updateOrder(Integer id, OrderDto dto) {
        OrderEntity order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with ID: " + id));

        order.setNotes(dto.getNotes());
        order.getItems().clear();

        BigDecimal subtotal = BigDecimal.ZERO;
        for (OrderItemDto itemDto : dto.getItems()) {
            MenuItemEntity menuItem = menuItemRepository.findById(itemDto.getMenuItemId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Menu item not found with ID: " + itemDto.getMenuItemId()));

            OrderItemEntity item = OrderItemEntity.builder()
                    .order(order)
                    .menuItem(menuItem)
                    .quantity(itemDto.getQuantity())
                    .price(menuItem.getPrice())
                    .notes(itemDto.getNotes())
                    .build();

            order.getItems().add(item);
            subtotal = subtotal.add(menuItem.getPrice().multiply(BigDecimal.valueOf(itemDto.getQuantity())));
        }

        order.setTotalAmount(subtotal);
        order = orderRepository.save(order);
        return mapToDto(order);
    }

    @Override
    @Transactional(readOnly = true)
    public OrderDto getOrderById(Integer id) {
        OrderEntity order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with ID: " + id));
        return mapToDto(order);
    }

    @Override
    @Transactional
    public void cancelOrder(Integer id) {
        OrderEntity order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with ID: " + id));

        OrderStatusEntity cancelled = statusRepository.findByName("CANCELLED")
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Status 'CANCELLED' not found."));

        order.setStatus(cancelled);
        orderRepository.save(order);

        if (order.getTable() != null) {
            RestaurantTableEntity table = order.getTable();
            table.setStatus("AVAILABLE");
            tableRepository.save(table);
        }
    }

    @Override
    @Transactional
    public OrderDto updateOrderStatus(Integer id, String statusName) {
        OrderEntity order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with ID: " + id));

        OrderStatusEntity status = statusRepository.findByName(statusName)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order Status not found: " + statusName));

        order.setStatus(status);
        order = orderRepository.save(order);

        if ("COMPLETED".equals(statusName) && order.getTable() != null) {
            RestaurantTableEntity table = order.getTable();
            table.setStatus("CLEANING");
            tableRepository.save(table);
        }

        return mapToDto(order);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrderDto> filterOrders(Integer statusId, Integer tableId, Integer customerId, Instant startTime, Instant endTime, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("orderTime").descending());
        Page<OrderEntity> orders = orderRepository.filterOrders(statusId, tableId, customerId, startTime, endTime, pageable);
        return orders.map(this::mapToDto);
    }

    private OrderDto mapToDto(OrderEntity order) {
        OrderDto dto = mapper.map(order, OrderDto.class);
        if (order.getCustomer() != null) {
            dto.setCustomerId(order.getCustomer().getId());
            dto.setCustomerName(order.getCustomer().getName());
        }
        if (order.getTable() != null) {
            dto.setTableId(order.getTable().getId());
            dto.setTableNumber(order.getTable().getTableNumber());
        }
        if (order.getRoom() != null) {
            dto.setRoomId(order.getRoom().getId());
            dto.setRoomNumber(order.getRoom().getRoomNumber());
        }
        dto.setStatusId(order.getStatus().getId());
        dto.setStatusName(order.getStatus().getName());

        dto.setItems(order.getItems().stream().map(item -> {
            OrderItemDto itemDto = mapper.map(item, OrderItemDto.class);
            itemDto.setMenuItemId(item.getMenuItem().getId());
            itemDto.setMenuItemName(item.getMenuItem().getName());
            return itemDto;
        }).collect(Collectors.toList()));

        return dto;
    }
}
