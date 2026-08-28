package com.rms.polkole.service.impl;

import com.rms.polkole.dto.DashboardDto;
import com.rms.polkole.entity.*;
import com.rms.polkole.repository.*;
import com.rms.polkole.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final RestaurantTableRepository tableRepository;
    private final RoomRepository roomRepository;
    private final ReservationRepository reservationRepository;
    private final HotelReservationRepository hotelReservationRepository;
    private final CheckInRepository checkInRepository;
    private final CheckOutRepository checkOutRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final KitchenOrderRepository kitchenOrderRepository;
    private final InvoiceRepository invoiceRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public DashboardDto getDashboardStats() {
        LocalDate today = LocalDate.now();
        ZoneId zoneId = ZoneId.systemDefault();

        // 1. Table Statistics
        List<RestaurantTableEntity> tables = tableRepository.findAll().stream()
                .filter(t -> !t.isDeleted())
                .collect(Collectors.toList());
        long totalTables = tables.size();
        long availableTables = tables.stream().filter(t -> "AVAILABLE".equalsIgnoreCase(t.getStatus())).count();
        long occupiedTables = tables.stream().filter(t -> "OCCUPIED".equalsIgnoreCase(t.getStatus())).count();
        long cleaningTables = tables.stream().filter(t -> "CLEANING".equalsIgnoreCase(t.getStatus())).count();
        double tableOccupancyRate = totalTables > 0 ? ((double) occupiedTables / totalTables) * 100.0 : 0.0;

        // 2. Room Statistics
        List<RoomEntity> rooms = roomRepository.findAll().stream()
                .filter(r -> !r.isDeleted())
                .collect(Collectors.toList());
        long totalRooms = rooms.size();
        long availableRooms = rooms.stream().filter(r -> "AVAILABLE".equalsIgnoreCase(r.getStatus())).count();
        long occupiedRooms = rooms.stream().filter(r -> "OCCUPIED".equalsIgnoreCase(r.getStatus())).count();
        long cleaningRooms = rooms.stream().filter(r -> "CLEANING".equalsIgnoreCase(r.getStatus())).count();
        long maintenanceRooms = rooms.stream().filter(r -> "MAINTENANCE".equalsIgnoreCase(r.getStatus())).count();
        double roomOccupancyRate = totalRooms > 0 ? ((double) occupiedRooms / totalRooms) * 100.0 : 0.0;

        // 3. Reservations & Arrivals
        long activeTableResToday = reservationRepository.findByReservationDate(today).stream()
                .filter(r -> !r.isDeleted() && (r.getReservationStatus() == null || !"CANCELLED".equalsIgnoreCase(r.getReservationStatus().getStatusName())))
                .count();

        List<HotelReservationEntity> hotelReservations = hotelReservationRepository.findAll().stream()
                .filter(r -> !r.isDeleted())
                .collect(Collectors.toList());

        long activeHotelResToday = hotelReservations.stream()
                .filter(r -> !"CANCELLED".equalsIgnoreCase(r.getStatus()))
                .filter(r -> today.equals(r.getCheckInDate()) || (r.getCheckInDate() != null && r.getCheckOutDate() != null && !today.isBefore(r.getCheckInDate()) && !today.isAfter(r.getCheckOutDate())))
                .count();

        long checkInsToday = checkInRepository.findAll().stream()
                .filter(ci -> ci.getCheckInTime() != null && LocalDate.ofInstant(ci.getCheckInTime(), zoneId).equals(today))
                .count();

        long checkOutsToday = checkOutRepository.findAll().stream()
                .filter(co -> co.getCheckOutTime() != null && LocalDate.ofInstant(co.getCheckOutTime(), zoneId).equals(today))
                .count();

        long activeRoomStays = hotelReservations.stream()
                .filter(r -> "CHECKED_IN".equalsIgnoreCase(r.getStatus()))
                .count();

        // 4. Orders & Kitchen Stats
        List<OrderEntity> allOrders = orderRepository.findAll().stream()
                .filter(o -> !o.isDeleted())
                .collect(Collectors.toList());

        LocalDate startOfWeek = today.minusDays(6);
        LocalDate startOfMonth = today.withDayOfMonth(1);

        long ordersTodayCount = allOrders.stream()
                .filter(o -> o.getOrderTime() != null && LocalDate.ofInstant(o.getOrderTime(), zoneId).equals(today))
                .count();

        long ordersThisWeekCount = allOrders.stream()
                .filter(o -> o.getOrderTime() != null && !LocalDate.ofInstant(o.getOrderTime(), zoneId).isBefore(startOfWeek))
                .count();

        long ordersThisMonthCount = allOrders.stream()
                .filter(o -> o.getOrderTime() != null && !LocalDate.ofInstant(o.getOrderTime(), zoneId).isBefore(startOfMonth))
                .count();

        long dineInCount = allOrders.stream()
                .filter(o -> o.getOrderTime() != null && LocalDate.ofInstant(o.getOrderTime(), zoneId).equals(today) && o.getTable() != null)
                .count();

        long roomServiceCount = allOrders.stream()
                .filter(o -> o.getOrderTime() != null && LocalDate.ofInstant(o.getOrderTime(), zoneId).equals(today) && o.getRoom() != null)
                .count();

        long takeawayCount = allOrders.stream()
                .filter(o -> o.getOrderTime() != null && LocalDate.ofInstant(o.getOrderTime(), zoneId).equals(today) && o.getTable() == null && o.getRoom() == null)
                .count();

        List<KitchenOrderEntity> activeKitchenOrders = kitchenOrderRepository.findActiveKitchenOrders();
        long pendingKitchen = activeKitchenOrders.size();
        long readyKitchen = kitchenOrderRepository.findByPreparationStatus("READY").size();

        // 5. Invoices & Revenue Calculations
        List<InvoiceEntity> allInvoices = invoiceRepository.findAll();

        BigDecimal revenueToday = BigDecimal.ZERO;
        BigDecimal revenueThisWeek = BigDecimal.ZERO;
        BigDecimal revenueThisMonth = BigDecimal.ZERO;
        long paidInvoicesToday = 0;
        long unpaidInvoicesToday = 0;
        BigDecimal unpaidInvoicesTotal = BigDecimal.ZERO;

        Map<String, BigDecimal> revenueByChannel = new LinkedHashMap<>();
        revenueByChannel.put("Dine-In", BigDecimal.ZERO);
        revenueByChannel.put("Takeaway", BigDecimal.ZERO);
        revenueByChannel.put("Room Service", BigDecimal.ZERO);
        revenueByChannel.put("Hotel Stays", BigDecimal.ZERO);

        for (InvoiceEntity inv : allInvoices) {
            BigDecimal amount = inv.getTotalAmount() != null ? inv.getTotalAmount() : BigDecimal.ZERO;
            LocalDate invDate = inv.getCreatedAt() != null ? LocalDate.ofInstant(inv.getCreatedAt(), zoneId) : today;

            if ("PAID".equalsIgnoreCase(inv.getPaymentStatus())) {
                if (invDate.equals(today)) {
                    revenueToday = revenueToday.add(amount);
                    paidInvoicesToday++;
                }
                if (!invDate.isBefore(startOfWeek) && !invDate.isAfter(today)) {
                    revenueThisWeek = revenueThisWeek.add(amount);
                }
                if (!invDate.isBefore(startOfMonth) && !invDate.isAfter(today)) {
                    revenueThisMonth = revenueThisMonth.add(amount);
                }

                // Channel Attribution
                if (inv.getOrder() != null) {
                    if (inv.getOrder().getTable() != null) {
                        revenueByChannel.put("Dine-In", revenueByChannel.get("Dine-In").add(amount));
                    } else if (inv.getOrder().getRoom() != null) {
                        revenueByChannel.put("Room Service", revenueByChannel.get("Room Service").add(amount));
                    } else {
                        revenueByChannel.put("Takeaway", revenueByChannel.get("Takeaway").add(amount));
                    }
                } else if (inv.getHotelReservation() != null) {
                    revenueByChannel.put("Hotel Stays", revenueByChannel.get("Hotel Stays").add(amount));
                } else if (inv.getTableReservation() != null) {
                    revenueByChannel.put("Dine-In", revenueByChannel.get("Dine-In").add(amount));
                }
            } else {
                if (invDate.equals(today)) {
                    unpaidInvoicesToday++;
                }
                unpaidInvoicesTotal = unpaidInvoicesTotal.add(amount);
            }
        }

        BigDecimal averageOrderValue = BigDecimal.ZERO;
        if (ordersTodayCount > 0 && revenueToday.compareTo(BigDecimal.ZERO) > 0) {
            averageOrderValue = revenueToday.divide(BigDecimal.valueOf(ordersTodayCount), 2, RoundingMode.HALF_UP);
        }

        // 6. Monthly & Weekly Revenue Trends
        Map<String, BigDecimal> monthlyRevenue = new LinkedHashMap<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate mDate = today.minusMonths(i);
            String mName = mDate.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + mDate.getYear();
            monthlyRevenue.put(mName, BigDecimal.ZERO);
        }

        Map<String, BigDecimal> weeklyRevenue = new LinkedHashMap<>();
        DateTimeFormatter dayFormatter = DateTimeFormatter.ofPattern("EEE dd");
        for (int i = 6; i >= 0; i--) {
            LocalDate wDate = today.minusDays(i);
            weeklyRevenue.put(wDate.format(dayFormatter), BigDecimal.ZERO);
        }

        for (InvoiceEntity inv : allInvoices) {
            if ("PAID".equalsIgnoreCase(inv.getPaymentStatus()) && inv.getCreatedAt() != null) {
                LocalDate invDate = LocalDate.ofInstant(inv.getCreatedAt(), zoneId);
                BigDecimal amount = inv.getTotalAmount() != null ? inv.getTotalAmount() : BigDecimal.ZERO;

                String mName = invDate.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH) + " " + invDate.getYear();
                if (monthlyRevenue.containsKey(mName)) {
                    monthlyRevenue.put(mName, monthlyRevenue.get(mName).add(amount));
                }

                String dName = invDate.format(dayFormatter);
                if (weeklyRevenue.containsKey(dName)) {
                    weeklyRevenue.put(dName, weeklyRevenue.get(dName).add(amount));
                }
            }
        }

        // 7. Order Status Distribution
        Map<String, Long> orderStatusDistribution = new LinkedHashMap<>();
        for (OrderEntity o : allOrders) {
            if (o.getOrderTime() != null && LocalDate.ofInstant(o.getOrderTime(), zoneId).equals(today)) {
                String sName = o.getStatus() != null ? o.getStatus().getName() : "PENDING";
                orderStatusDistribution.put(sName, orderStatusDistribution.getOrDefault(sName, 0L) + 1);
            }
        }

        // 8. Low Stock Items
        List<InventoryItemEntity> lowStockEntities = inventoryItemRepository.findLowStockItems();
        long lowStockCount = lowStockEntities.size();
        List<DashboardDto.LowStockAlertDto> lowStockList = lowStockEntities.stream()
                .limit(6)
                .map(item -> DashboardDto.LowStockAlertDto.builder()
                        .itemId(item.getId())
                        .itemName(item.getItemName())
                        .unit(item.getUnit())
                        .currentStock(item.getQuantity() != null ? item.getQuantity() : BigDecimal.ZERO)
                        .minimumStockLevel(item.getMinimumStockLevel() != null ? item.getMinimumStockLevel() : BigDecimal.ZERO)
                        .status(item.getQuantity() != null && item.getQuantity().compareTo(BigDecimal.ZERO) <= 0 ? "OUT_OF_STOCK" : "CRITICAL_LOW")
                        .build())
                .collect(Collectors.toList());

        // 9. Staff on duty
        List<AttendanceEntity> todayAttendances = attendanceRepository.findByAttendanceDate(today);
        long staffOnDuty = todayAttendances.stream()
                .filter(a -> a.getStatus() != null && ("PRESENT".equalsIgnoreCase(a.getStatus().name()) || "LATE".equalsIgnoreCase(a.getStatus().name()) || "HALF_DAY".equalsIgnoreCase(a.getStatus().name())))
                .count();
        long totalStaff = userRepository.count();

        // 10. Top Selling Items
        List<OrderItemEntity> orderItems = orderItemRepository.findAll();
        Map<Integer, Long> itemQtyMap = new HashMap<>();
        Map<Integer, BigDecimal> itemRevMap = new HashMap<>();
        Map<Integer, MenuItemEntity> itemEntityMap = new HashMap<>();

        for (OrderItemEntity oi : orderItems) {
            if (oi.getMenuItem() != null && oi.getQuantity() != null) {
                int mId = oi.getMenuItem().getId();
                itemEntityMap.put(mId, oi.getMenuItem());
                itemQtyMap.put(mId, itemQtyMap.getOrDefault(mId, 0L) + oi.getQuantity());

                BigDecimal price = oi.getPrice() != null ? oi.getPrice() : BigDecimal.ZERO;
                BigDecimal lineRev = price.multiply(BigDecimal.valueOf(oi.getQuantity()));
                itemRevMap.put(mId, itemRevMap.getOrDefault(mId, BigDecimal.ZERO).add(lineRev));
            }
        }

        List<DashboardDto.TopSellingItemDto> topSellingItems = itemQtyMap.entrySet().stream()
                .sorted((e1, e2) -> Long.compare(e2.getValue(), e1.getValue()))
                .limit(5)
                .map(e -> {
                    MenuItemEntity m = itemEntityMap.get(e.getKey());
                    return DashboardDto.TopSellingItemDto.builder()
                            .itemId(e.getKey())
                            .itemName(m != null ? m.getName() : "Item #" + e.getKey())
                            .categoryName(m != null && m.getCategory() != null ? m.getCategory().getName() : "General")
                            .quantitySold(e.getValue())
                            .totalRevenue(itemRevMap.getOrDefault(e.getKey(), BigDecimal.ZERO))
                            .build();
                })
                .collect(Collectors.toList());

        // 11. Recent Live Orders
        List<DashboardDto.RecentOrderSummaryDto> recentOrders = allOrders.stream()
                .sorted((o1, o2) -> {
                    Instant t1 = o1.getOrderTime() != null ? o1.getOrderTime() : Instant.MIN;
                    Instant t2 = o2.getOrderTime() != null ? o2.getOrderTime() : Instant.MIN;
                    return t2.compareTo(t1);
                })
                .limit(6)
                .map(o -> {
                    String type = "TAKEAWAY";
                    String loc = "Takeaway Counter";
                    if (o.getTable() != null) {
                        type = "DINE_IN";
                        loc = "Table " + o.getTable().getTableNumber();
                    } else if (o.getRoom() != null) {
                        type = "ROOM_SERVICE";
                        loc = "Room " + o.getRoom().getRoomNumber();
                    }

                    String cName = o.getCustomer() != null ? o.getCustomer().getName() : "Walk-in Guest";
                    int count = o.getItems() != null ? o.getItems().size() : 0;
                    String statusName = o.getStatus() != null ? o.getStatus().getName() : "PENDING";

                    return DashboardDto.RecentOrderSummaryDto.builder()
                            .id(o.getId())
                            .orderNumber("ORD-" + String.format("%04d", o.getId()))
                            .orderTime(o.getOrderTime())
                            .orderType(type)
                            .locationInfo(loc)
                            .customerName(cName)
                            .totalAmount(o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                            .status(statusName)
                            .itemCount(count)
                            .build();
                })
                .collect(Collectors.toList());

        // 12. Today's Reservations (Tables + Rooms)
        List<DashboardDto.DashboardReservationDto> todaysReservations = new ArrayList<>();

        List<ReservationEntity> tableRes = reservationRepository.findByReservationDate(today).stream()
                .filter(r -> !r.isDeleted())
                .collect(Collectors.toList());

        for (ReservationEntity tr : tableRes) {
            String guest = tr.getCustomer() != null ? tr.getCustomer().getName() : "Table Guest";
            String contact = tr.getCustomer() != null ? tr.getCustomer().getPhone() : "N/A";
            String target = tr.getTable() != null ? "Table " + tr.getTable().getTableNumber() : "Table TBD";
            String stat = tr.getReservationStatus() != null ? tr.getReservationStatus().getStatusName() : "CONFIRMED";

            todaysReservations.add(DashboardDto.DashboardReservationDto.builder()
                    .id(tr.getId())
                    .reservationType("TABLE")
                    .customerName(guest)
                    .customerContact(contact != null ? contact : "N/A")
                    .targetNumber(target)
                    .reservationTimeOrDate(tr.getReservationTime() != null ? tr.getReservationTime() : "Today")
                    .guestsCount(tr.getGuestsCount() != null ? tr.getGuestsCount() : 2)
                    .status(stat)
                    .build());
        }

        for (HotelReservationEntity hr : hotelReservations) {
            if (!"CANCELLED".equalsIgnoreCase(hr.getStatus()) && (today.equals(hr.getCheckInDate()) || today.equals(hr.getCheckOutDate()))) {
                String guest = hr.getCustomer() != null ? hr.getCustomer().getName() : "Hotel Guest";
                String contact = hr.getCustomer() != null ? hr.getCustomer().getPhone() : "N/A";
                String target = hr.getRoom() != null ? "Room " + hr.getRoom().getRoomNumber() : "Room TBD";
                String timeOrDate = today.equals(hr.getCheckInDate()) ? "Arrival: " + hr.getCheckInDate() : "Departure: " + hr.getCheckOutDate();

                todaysReservations.add(DashboardDto.DashboardReservationDto.builder()
                        .id(hr.getId())
                        .reservationType("ROOM")
                        .customerName(guest)
                        .customerContact(contact != null ? contact : "N/A")
                        .targetNumber(target)
                        .reservationTimeOrDate(timeOrDate)
                        .guestsCount(hr.getGuestsCount() != null ? hr.getGuestsCount() : 1)
                        .status(hr.getStatus())
                        .build());
            }
        }

        // 13. Active Kitchen Tickets
        List<DashboardDto.KitchenTicketSummaryDto> activeTickets = activeKitchenOrders.stream()
                .limit(6)
                .map(ko -> {
                    String loc = "Takeaway";
                    int count = 0;
                    if (ko.getOrder() != null) {
                        if (ko.getOrder().getTable() != null) {
                            loc = "Table " + ko.getOrder().getTable().getTableNumber();
                        } else if (ko.getOrder().getRoom() != null) {
                            loc = "Room " + ko.getOrder().getRoom().getRoomNumber();
                        }
                        if (ko.getOrder().getItems() != null) {
                            count = ko.getOrder().getItems().size();
                        }
                    }

                    return DashboardDto.KitchenTicketSummaryDto.builder()
                            .ticketId(ko.getId())
                            .orderId(ko.getOrder() != null ? ko.getOrder().getId() : null)
                            .station(ko.getStation() != null ? ko.getStation() : "Main Station")
                            .preparationStatus(ko.getPreparationStatus())
                            .preparationTimer(ko.getPreparationTimer())
                            .startTime(ko.getStartTime())
                            .locationInfo(loc)
                            .itemsCount(count)
                            .build();
                })
                .collect(Collectors.toList());

        return DashboardDto.builder()
                .totalTables(totalTables)
                .occupiedTables(occupiedTables)
                .availableTables(availableTables)
                .cleaningTables(cleaningTables)
                .tableOccupancyRate(Math.round(tableOccupancyRate * 10.0) / 10.0)
                .totalRooms(totalRooms)
                .occupiedRooms(occupiedRooms)
                .availableRooms(availableRooms)
                .cleaningRooms(cleaningRooms)
                .maintenanceRooms(maintenanceRooms)
                .roomOccupancyRate(Math.round(roomOccupancyRate * 10.0) / 10.0)
                .activeTableReservationsToday(activeTableResToday)
                .activeHotelReservationsToday(activeHotelResToday)
                .checkInsToday(checkInsToday)
                .checkOutsToday(checkOutsToday)
                .activeRoomStaysToday(activeRoomStays)
                .ordersToday(ordersTodayCount)
                .ordersThisWeek(ordersThisWeekCount)
                .ordersThisMonth(ordersThisMonthCount)
                .revenueToday(revenueToday)
                .revenueThisWeek(revenueThisWeek)
                .revenueThisMonth(revenueThisMonth)
                .averageOrderValue(averageOrderValue)
                .paidInvoicesToday(paidInvoicesToday)
                .unpaidInvoicesToday(unpaidInvoicesToday)
                .unpaidInvoicesTotalAmount(unpaidInvoicesTotal)
                .pendingKitchenOrders(pendingKitchen)
                .readyKitchenOrders(readyKitchen)
                .lowStockInventoryAlerts(lowStockCount)
                .staffOnDutyToday(staffOnDuty)
                .totalStaffCount(totalStaff)
                .dineInOrdersCount(dineInCount)
                .takeawayOrdersCount(takeawayCount)
                .roomServiceOrdersCount(roomServiceCount)
                .monthlyRevenue(monthlyRevenue)
                .weeklyRevenue(weeklyRevenue)
                .revenueByChannel(revenueByChannel)
                .orderStatusDistribution(orderStatusDistribution)
                .recentOrders(recentOrders)
                .todaysReservations(todaysReservations)
                .topSellingItems(topSellingItems)
                .lowStockItems(lowStockList)
                .activeKitchenTickets(activeTickets)
                .build();
    }
}
