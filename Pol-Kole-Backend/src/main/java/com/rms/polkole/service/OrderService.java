package com.rms.polkole.service;

import com.rms.polkole.dto.OrderDto;
import org.springframework.data.domain.Page;
import java.time.Instant;

public interface OrderService {
    OrderDto createOrder(OrderDto dto);
    OrderDto updateOrder(Integer id, OrderDto dto);
    OrderDto getOrderById(Integer id);
    void cancelOrder(Integer id);
    OrderDto updateOrderStatus(Integer id, String statusName);
    Page<OrderDto> filterOrders(Integer statusId, Integer tableId, Integer customerId, Instant startTime, Instant endTime, int page, int size);
}
