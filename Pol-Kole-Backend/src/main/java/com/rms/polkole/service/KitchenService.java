package com.rms.polkole.service;

import com.rms.polkole.dto.KitchenOrderDto;
import java.util.List;

public interface KitchenService {
    KitchenOrderDto updatePreparationStatus(Integer id, String statusName);
    KitchenOrderDto getKitchenOrderById(Integer id);
    List<KitchenOrderDto> getActiveKitchenOrders();
    List<KitchenOrderDto> getKitchenOrdersByStatus(String status);
    List<KitchenOrderDto> getServedKitchenOrders();
}
