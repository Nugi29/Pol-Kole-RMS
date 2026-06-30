package com.rms.polkole.service.impl;

import com.rms.polkole.dto.DashboardDto;
import com.rms.polkole.entity.InvoiceEntity;
import com.rms.polkole.entity.RestaurantTableEntity;
import com.rms.polkole.repository.*;
import com.rms.polkole.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final RestaurantTableRepository tableRepository;
    private final ReservationRepository reservationRepository;
    private final OrderRepository orderRepository;
    private final KitchenOrderRepository kitchenOrderRepository;
    private final InvoiceRepository invoiceRepository;
    private final InventoryItemRepository inventoryItemRepository;

    @Override
    @Transactional(readOnly = true)
    public DashboardDto getDashboardStats() {
        List<RestaurantTableEntity> tables = tableRepository.findAll();
        long total = tables.size();
        long available = tables.stream().filter(t -> "AVAILABLE".equalsIgnoreCase(t.getStatus())).count();
        long occupied = tables.stream().filter(t -> "OCCUPIED".equalsIgnoreCase(t.getStatus())).count();
        long cleaning = tables.stream().filter(t -> "CLEANING".equalsIgnoreCase(t.getStatus())).count();

        LocalDate today = LocalDate.now();
        long activeReservations = reservationRepository.findByReservationDate(today).stream()
                .filter(r -> !"CANCELLED".equalsIgnoreCase(r.getReservationStatus().getStatusName()))
                .count();

        long ordersTodayCount = orderRepository.findAll().stream()
                .filter(o -> {
                    LocalDate oDate = LocalDate.ofInstant(o.getOrderTime(), java.time.ZoneId.systemDefault());
                    return oDate.equals(today);
                }).count();

        long pendingKitchen = kitchenOrderRepository.findActiveKitchenOrders().size();
        long lowStockCount = inventoryItemRepository.findLowStockItems().size();

        // Calculate Revenue Today
        BigDecimal revenueToday = invoiceRepository.findAll().stream()
                .filter(inv -> "PAID".equalsIgnoreCase(inv.getPaymentStatus()) && inv.getCreatedAt() != null)
                .filter(inv -> {
                    LocalDate invDate = LocalDate.ofInstant(inv.getCreatedAt(), java.time.ZoneId.systemDefault());
                    return invDate.equals(today);
                })
                .map(InvoiceEntity::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Compile monthly revenue past 6 months
        Map<String, BigDecimal> revenueMap = new LinkedHashMap<>();
        List<InvoiceEntity> invoices = invoiceRepository.findAll();

        // Initialize past 6 months with Zero
        for (int i = 5; i >= 0; i--) {
            LocalDate monthDate = today.minusMonths(i);
            String monthName = monthDate.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + monthDate.getYear();
            revenueMap.put(monthName, BigDecimal.ZERO);
        }

        // Aggregate Paid Invoices
        for (InvoiceEntity inv : invoices) {
            if ("PAID".equalsIgnoreCase(inv.getPaymentStatus()) && inv.getCreatedAt() != null) {
                LocalDate invDate = LocalDate.ofInstant(inv.getCreatedAt(), java.time.ZoneId.systemDefault());
                String monthName = invDate.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + invDate.getYear();
                if (revenueMap.containsKey(monthName)) {
                    BigDecimal existing = revenueMap.get(monthName);
                    revenueMap.put(monthName, existing.add(inv.getTotalAmount()));
                }
            }
        }

        return DashboardDto.builder()
                .totalTables(total)
                .occupiedTables(occupied)
                .availableTables(available)
                .cleaningTables(cleaning)
                .activeReservationsToday(activeReservations)
                .ordersToday(ordersTodayCount)
                .revenueToday(revenueToday)
                .pendingKitchenOrders(pendingKitchen)
                .lowStockInventoryAlerts(lowStockCount)
                .monthlyRevenue(revenueMap)
                .build();
    }
}
