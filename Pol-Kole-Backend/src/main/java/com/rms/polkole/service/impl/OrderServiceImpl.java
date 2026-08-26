package com.rms.polkole.service.impl;

import com.rms.polkole.dto.OrderDto;
import com.rms.polkole.dto.OrderItemDto;
import com.rms.polkole.dto.StaffNotificationDto;
import com.rms.polkole.entity.*;
import com.rms.polkole.repository.*;
import com.rms.polkole.service.ItemDiscountService;
import com.rms.polkole.service.OrderService;
import com.rms.polkole.service.StaffAssignmentService;
import com.rms.polkole.service.StaffNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.stream.Collectors;

@Slf4j
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
    private final UserRepository userRepository;
    private final ModelMapper mapper;
    private final ItemDiscountService itemDiscountService;
    private final StaffAssignmentService staffAssignmentService;
    private final StaffNotificationService notificationService;

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

        UserEntity assignedWaiter = null;
        LocalDate today = LocalDate.now();
        if (dto.getAssignedWaiterId() != null) {
            assignedWaiter = userRepository.findById(dto.getAssignedWaiterId()).orElse(null);
        } else if (table != null) {
            assignedWaiter = staffAssignmentService.findResponsibleWaiterForTable(today, table.getId()).orElse(null);
        } else if (room != null) {
            assignedWaiter = staffAssignmentService.findResponsibleWaiterForRoom(today, room.getId()).orElse(null);
        }

        OrderEntity order = OrderEntity.builder()
                .table(table)
                .room(room)
                .customer(customer)
                .assignedWaiter(assignedWaiter)
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

        UserEntity assignedChef = staffAssignmentService.findResponsibleChefForCategory(today, null).orElse(null);

        KitchenOrderEntity kitchenOrder = KitchenOrderEntity.builder()
                .order(order)
                .assignedChef(assignedChef)
                .station("Main Kitchen")
                .preparationStatus("RECEIVED")
                .preparationTimer(15)
                .startTime(Instant.now())
                .build();
        kitchenOrderRepository.save(kitchenOrder);

        String locLabel = table != null ? table.getTableNumber() : (room != null ? "Room " + room.getRoomNumber() : "Takeaway");
        if (assignedWaiter != null) {
            notificationService.sendTargetedNotification(StaffNotificationDto.builder()
                    .recipientId(assignedWaiter.getId())
                    .type("NEW_ORDER")
                    .title("New Order #" + order.getId() + " - " + locLabel)
                    .message("Order #" + order.getId() + " created for " + locLabel + " (Rs. " + subtotal + ")")
                    .targetType("ORDER")
                    .targetId(order.getId())
                    .targetLabel(locLabel)
                    .priority("MEDIUM")
                    .build());
        }

        if (assignedChef != null) {
            notificationService.sendTargetedNotification(StaffNotificationDto.builder()
                    .recipientId(assignedChef.getId())
                    .type("NEW_KITCHEN_ORDER")
                    .title("New Kitchen Ticket #" + order.getId() + " - " + locLabel)
                    .message(order.getItems().size() + " items to prepare for " + locLabel)
                    .targetType("KITCHEN")
                    .targetId(order.getId())
                    .targetLabel(locLabel)
                    .priority("HIGH")
                    .build());
        }

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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Status CANCELLED not found"));
        order.setStatus(cancelled);
        if (order.getTable() != null) {
            order.getTable().setStatus("AVAILABLE");
            tableRepository.save(order.getTable());
        }
        orderRepository.save(order);
    }

    @Override
    @Transactional
    public OrderDto updateOrderStatus(Integer id, String statusName) {
        OrderEntity order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with ID: " + id));

        OrderStatusEntity status = statusRepository.findByName(statusName.toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + statusName));

        order.setStatus(status);

        if ("COMPLETED".equalsIgnoreCase(statusName) || "CANCELLED".equalsIgnoreCase(statusName)) {
            if (order.getTable() != null) {
                RestaurantTableEntity table = order.getTable();
                table.setStatus("AVAILABLE");
                tableRepository.save(table);
            }
        }

        order = orderRepository.save(order);

        if ("READY".equalsIgnoreCase(statusName) && order.getAssignedWaiter() != null) {
            String loc = order.getTable() != null ? order.getTable().getTableNumber() : (order.getRoom() != null ? "Room " + order.getRoom().getRoomNumber() : "Takeaway");
            notificationService.sendTargetedNotification(StaffNotificationDto.builder()
                    .recipientId(order.getAssignedWaiter().getId())
                    .type("ORDER_READY")
                    .title("Order #" + order.getId() + " Ready to Serve! (" + loc + ")")
                    .message("Food preparation is finished. Please pick up and deliver to " + loc)
                    .targetType("ORDER")
                    .targetId(order.getId())
                    .targetLabel(loc)
                    .priority("URGENT")
                    .build());
        }

        return mapToDto(order);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<OrderDto> filterOrders(Integer statusId, Integer tableId, Integer roomId, Integer customerId, Instant startTime, Instant endTime, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("orderTime").descending());

        return orderRepository.filterOrders(statusId, tableId, roomId, customerId, startTime, endTime, pageable).map(this::mapToDto); /*
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();

            if (statusId != null) {
                predicates.add(cb.equal(root.get("status").get("id"), statusId));
            }
            if (tableId != null) {
                predicates.add(cb.equal(root.get("table").get("id"), tableId));
            }
            if (roomId != null) {
                predicates.add(cb.equal(root.get("room").get("id"), roomId));
            }
            if (customerId != null) {
                predicates.add(cb.equal(root.get("customer").get("id"), customerId));
            }
            if (startTime != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("orderTime"), startTime));
            }
            if (endTime != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("orderTime"), endTime));
            }

            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        */
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
        if (order.getAssignedWaiter() != null) {
            dto.setAssignedWaiterId(order.getAssignedWaiter().getId());
            dto.setAssignedWaiterName(order.getAssignedWaiter().getName());
        }
        if (order.getStatus() != null) {
            dto.setStatusId(order.getStatus().getId());
            dto.setStatusName(order.getStatus().getName());
        }
        if (order.getItems() != null) {
            dto.setItems(order.getItems().stream().map(item -> OrderItemDto.builder()
                    .id(item.getId())
                    .menuItemId(item.getMenuItem() != null ? item.getMenuItem().getId() : null)
                    .menuItemName(item.getMenuItem() != null ? item.getMenuItem().getName() : null)
                    .quantity(item.getQuantity())
                    .price(item.getPrice())
                    .notes(item.getNotes())
                    .build()).collect(Collectors.toList()));
        }
        return dto;
    }
}
