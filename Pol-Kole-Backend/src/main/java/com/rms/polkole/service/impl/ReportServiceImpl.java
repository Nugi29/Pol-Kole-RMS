package com.rms.polkole.service.impl;

import com.rms.polkole.dto.ReportDto.*;
import com.rms.polkole.dto.RestaurantTableDto;
import com.rms.polkole.dto.reporting.*;
import com.rms.polkole.dto.RestaurantSettingsDto;
import com.rms.polkole.entity.*;
import com.rms.polkole.repository.*;
import com.rms.polkole.service.ReportService;
import com.rms.polkole.service.RestaurantSettingsService;
import lombok.RequiredArgsConstructor;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import net.sf.jasperreports.engine.design.JasperDesign;
import net.sf.jasperreports.engine.xml.JRXmlLoader;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final OrderRepository orderRepository;
    private final MenuItemRepository menuItemRepository;
    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final HotelReservationRepository hotelReservationRepository;
    private final CheckInRepository checkInRepository;
    private final CheckOutRepository checkOutRepository;
    private final KitchenOrderRepository kitchenOrderRepository;
    private final UserRepository userRepository;
    private final AttendanceRepository attendanceRepository;
    private final CustomerRepository customerRepository;
    private final VoucherRepository voucherRepository;
    private final RestaurantSettingsService settingsService;
    private final RestaurantTableRepository restaurantTableRepository;
    private final ReservationRepository reservationRepository;

    private static final ZoneId SYSTEM_ZONE = ZoneId.systemDefault();

    private Instant toStartOfDayInstant(LocalDate date) {
        return date.atStartOfDay(SYSTEM_ZONE).toInstant();
    }

    private Instant toEndOfDayInstant(LocalDate date) {
        return date.plusDays(1).atStartOfDay(SYSTEM_ZONE).toInstant().minusNanos(1);
    }

    private String formatPeriod(LocalDate start, LocalDate end) {
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        return start.format(dtf) + " to " + end.format(dtf);
    }

    @Override
    @Transactional(readOnly = true)
    public DailyFlashReportDto getDailyFlashReport(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();

        Instant startInstant = toStartOfDayInstant(startDate);
        Instant endInstant = toEndOfDayInstant(endDate);

        List<InvoiceEntity> invoices = invoiceRepository.findAll().stream()
                .filter(i -> i.getCreatedAt() != null && !i.getCreatedAt().isBefore(startInstant) && !i.getCreatedAt().isAfter(endInstant))
                .collect(Collectors.toList());

        BigDecimal grossSales = invoices.stream().map(i -> i.getOrderSubtotal() != null ? i.getOrderSubtotal() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalTax = invoices.stream().map(i -> i.getTaxAmount() != null ? i.getTaxAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalDiscounts = invoices.stream().map(i -> i.getDiscountAmount() != null ? i.getDiscountAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal netRevenue = invoices.stream().map(i -> i.getTotalAmount() != null ? i.getTotalAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);

        List<OrderEntity> orders = orderRepository.findAll().stream()
                .filter(o -> !o.isDeleted() && o.getOrderTime() != null && !o.getOrderTime().isBefore(startInstant) && !o.getOrderTime().isAfter(endInstant))
                .collect(Collectors.toList());

        long totalOrders = orders.size();
        long totalInvoices = invoices.size();
        BigDecimal avgOrderValue = totalInvoices > 0 ? netRevenue.divide(BigDecimal.valueOf(totalInvoices), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        // Payment Breakdown
        List<PaymentEntity> payments = paymentRepository.findAll().stream()
                .filter(p -> p.getPaymentDate() != null && !p.getPaymentDate().isBefore(startInstant) && !p.getPaymentDate().isAfter(endInstant))
                .collect(Collectors.toList());

        Map<String, List<PaymentEntity>> byMethod = payments.stream()
                .collect(Collectors.groupingBy(p -> p.getPaymentMethod() != null ? p.getPaymentMethod().getName() : "Other"));

        BigDecimal totalPaymentAmount = payments.stream().map(p -> p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);

        List<PaymentBreakdownDto> paymentBreakdown = byMethod.entrySet().stream()
                .map(entry -> {
                    BigDecimal sum = entry.getValue().stream().map(p -> p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
                    double pct = totalPaymentAmount.compareTo(BigDecimal.ZERO) > 0 ? sum.divide(totalPaymentAmount, 4, RoundingMode.HALF_UP).doubleValue() * 100.0 : 0.0;
                    return PaymentBreakdownDto.builder()
                            .paymentMethod(entry.getKey())
                            .transactionCount((long) entry.getValue().size())
                            .totalAmount(sum)
                            .percentage(Math.round(pct * 100.0) / 100.0)
                            .build();
                })
                .sorted((a, b) -> b.getTotalAmount().compareTo(a.getTotalAmount()))
                .collect(Collectors.toList());

        // Channel Revenues
        Map<String, List<InvoiceEntity>> byChannel = invoices.stream()
                .collect(Collectors.groupingBy(inv -> {
                    if (inv.getOrder() != null) {
                        if (inv.getOrder().getTable() != null) return "Dine-In";
                        if (inv.getOrder().getRoom() != null) return "Room Service";
                        return "Takeaway";
                    } else if (inv.getHotelReservation() != null) {
                        return "Hotel Room Stays";
                    } else {
                        return "Table Reservation";
                    }
                }));

        List<ChannelRevenueDto> channelRevenues = byChannel.entrySet().stream()
                .map(entry -> {
                    BigDecimal rev = entry.getValue().stream().map(i -> i.getTotalAmount() != null ? i.getTotalAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
                    double pct = netRevenue.compareTo(BigDecimal.ZERO) > 0 ? rev.divide(netRevenue, 4, RoundingMode.HALF_UP).doubleValue() * 100.0 : 0.0;
                    return ChannelRevenueDto.builder()
                            .channel(entry.getKey())
                            .count((long) entry.getValue().size())
                            .totalRevenue(rev)
                            .percentage(Math.round(pct * 100.0) / 100.0)
                            .build();
                })
                .sorted((a, b) -> b.getTotalRevenue().compareTo(a.getTotalRevenue()))
                .collect(Collectors.toList());

        return DailyFlashReportDto.builder()
                .period(formatPeriod(startDate, endDate))
                .grossSales(grossSales)
                .totalTax(totalTax)
                .totalDiscounts(totalDiscounts)
                .netRevenue(netRevenue)
                .totalOrders(totalOrders)
                .totalInvoices(totalInvoices)
                .averageOrderValue(avgOrderValue)
                .paymentMethods(paymentBreakdown)
                .channelRevenues(channelRevenues)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public MenuSalesReportDto getMenuSalesReport(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();

        Instant startInstant = toStartOfDayInstant(startDate);
        Instant endInstant = toEndOfDayInstant(endDate);

        List<MenuItemEntity> allMenuItems = menuItemRepository.findAll().stream()
                .filter(m -> !m.isDeleted())
                .collect(Collectors.toList());

        List<OrderEntity> orders = orderRepository.findAll().stream()
                .filter(o -> !o.isDeleted() && o.getOrderTime() != null && !o.getOrderTime().isBefore(startInstant) && !o.getOrderTime().isAfter(endInstant))
                .collect(Collectors.toList());

        Map<Integer, Long> itemQtyMap = new HashMap<>();
        Map<Integer, BigDecimal> itemRevenueMap = new HashMap<>();

        for (OrderEntity order : orders) {
            if (order.getItems() != null) {
                for (OrderItemEntity oi : order.getItems()) {
                    if (oi.getMenuItem() != null) {
                        int mId = oi.getMenuItem().getId();
                        long q = oi.getQuantity() != null ? oi.getQuantity() : 0L;
                        BigDecimal p = oi.getPrice() != null ? oi.getPrice().multiply(BigDecimal.valueOf(q)) : BigDecimal.ZERO;
                        itemQtyMap.put(mId, itemQtyMap.getOrDefault(mId, 0L) + q);
                        itemRevenueMap.put(mId, itemRevenueMap.getOrDefault(mId, BigDecimal.ZERO).add(p));
                    }
                }
            }
        }

        BigDecimal totalMenuRevenue = itemRevenueMap.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        long totalUnitsSold = itemQtyMap.values().stream().mapToLong(Long::longValue).sum();

        List<MenuItemSalesDto> fullMenuList = allMenuItems.stream()
                .map(item -> {
                    long qty = itemQtyMap.getOrDefault(item.getId(), 0L);
                    BigDecimal rev = itemRevenueMap.getOrDefault(item.getId(), BigDecimal.ZERO);
                    double share = totalMenuRevenue.compareTo(BigDecimal.ZERO) > 0 ? rev.divide(totalMenuRevenue, 4, RoundingMode.HALF_UP).doubleValue() * 100.0 : 0.0;

                    String tag;
                    if (qty == 0) {
                        tag = "Zero Sales";
                    } else if (share >= 10.0) {
                        tag = "Top Seller";
                    } else if (share >= 3.0) {
                        tag = "Moderate";
                    } else {
                        tag = "Slow Moving";
                    }

                    return MenuItemSalesDto.builder()
                            .itemId(item.getId())
                            .itemName(item.getName())
                            .categoryName(item.getCategory() != null ? item.getCategory().getName() : "Uncategorized")
                            .unitPrice(item.getPrice())
                            .quantitySold(qty)
                            .totalRevenue(rev)
                            .salesContributionPercent(Math.round(share * 100.0) / 100.0)
                            .isAvailable(item.isAvailable())
                            .performanceTag(tag)
                            .build();
                })
                .sorted((a, b) -> {
                    int c = b.getQuantitySold().compareTo(a.getQuantitySold());
                    return c != 0 ? c : b.getTotalRevenue().compareTo(a.getTotalRevenue());
                })
                .collect(Collectors.toList());

        // Category breakdown
        Map<String, List<MenuItemSalesDto>> byCat = fullMenuList.stream()
                .collect(Collectors.groupingBy(MenuItemSalesDto::getCategoryName));

        List<CategorySalesDto> categoryBreakdown = byCat.entrySet().stream()
                .map(entry -> {
                    long units = entry.getValue().stream().mapToLong(MenuItemSalesDto::getQuantitySold).sum();
                    BigDecimal catRev = entry.getValue().stream().map(MenuItemSalesDto::getTotalRevenue).reduce(BigDecimal.ZERO, BigDecimal::add);
                    double share = totalMenuRevenue.compareTo(BigDecimal.ZERO) > 0 ? catRev.divide(totalMenuRevenue, 4, RoundingMode.HALF_UP).doubleValue() * 100.0 : 0.0;
                    return CategorySalesDto.builder()
                            .categoryName(entry.getKey())
                            .unitsSold(units)
                            .totalRevenue(catRev)
                            .revenueSharePercent(Math.round(share * 100.0) / 100.0)
                            .build();
                })
                .sorted((a, b) -> b.getTotalRevenue().compareTo(a.getTotalRevenue()))
                .collect(Collectors.toList());

        long activeItemsSold = fullMenuList.stream().filter(m -> m.getQuantitySold() > 0).count();

        return MenuSalesReportDto.builder()
                .period(formatPeriod(startDate, endDate))
                .totalMenuItems((long) allMenuItems.size())
                .activeItemsSold(activeItemsSold)
                .totalUnitsSold(totalUnitsSold)
                .totalMenuRevenue(totalMenuRevenue)
                .categoryBreakdown(categoryBreakdown)
                .fullMenuList(fullMenuList)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public HotelPerformanceReportDto getHotelPerformanceReport(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();

        final LocalDate finalStart = startDate;
        final LocalDate finalEnd = endDate;

        List<RoomEntity> allRooms = roomRepository.findAll().stream().filter(r -> !r.isDeleted()).collect(Collectors.toList());
        long totalRooms = allRooms.size();
        long occupiedRooms = allRooms.stream().filter(r -> "OCCUPIED".equalsIgnoreCase(r.getStatus())).count();
        long availableRooms = allRooms.stream().filter(r -> "AVAILABLE".equalsIgnoreCase(r.getStatus())).count();
        double occupancyRate = totalRooms > 0 ? Math.round(((double) occupiedRooms / totalRooms) * 1000.0) / 10.0 : 0.0;

        List<HotelReservationEntity> reservations = hotelReservationRepository.findAll().stream()
                .filter(r -> !r.isDeleted() && !"CANCELLED".equalsIgnoreCase(r.getStatus()))
                .filter(r -> r.getCheckInDate() != null && !r.getCheckInDate().isAfter(finalEnd) &&
                        (r.getCheckOutDate() == null || !r.getCheckOutDate().isBefore(finalStart)))
                .collect(Collectors.toList());

        Instant startInstant = toStartOfDayInstant(startDate);
        Instant endInstant = toEndOfDayInstant(endDate);

        List<InvoiceEntity> roomInvoices = invoiceRepository.findAll().stream()
                .filter(i -> i.getHotelReservation() != null && i.getCreatedAt() != null && !i.getCreatedAt().isBefore(startInstant) && !i.getCreatedAt().isAfter(endInstant))
                .collect(Collectors.toList());

        BigDecimal totalRoomRevenue = roomInvoices.stream()
                .map(i -> i.getTotalAmount() != null ? i.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long reservationsCount = reservations.size();
        BigDecimal adr = reservationsCount > 0 ? totalRoomRevenue.divide(BigDecimal.valueOf(reservationsCount), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal revPar = totalRooms > 0 ? totalRoomRevenue.divide(BigDecimal.valueOf(totalRooms), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        long totalCheckIns = checkInRepository.findAll().stream()
                .filter(ci -> ci.getCheckInTime() != null && !ci.getCheckInTime().isBefore(startInstant) && !ci.getCheckInTime().isAfter(endInstant))
                .count();

        long totalCheckOuts = checkOutRepository.findAll().stream()
                .filter(co -> co.getCheckOutTime() != null && !co.getCheckOutTime().isBefore(startInstant) && !co.getCheckOutTime().isAfter(endInstant))
                .count();

        double avgStayDays = reservations.stream()
                .filter(r -> r.getCheckInDate() != null && r.getCheckOutDate() != null)
                .mapToLong(r -> Math.max(1, ChronoUnit.DAYS.between(r.getCheckInDate(), r.getCheckOutDate())))
                .average().orElse(1.0);

        List<RoomTypeEntity> roomTypes = roomTypeRepository.findAll();
        List<RoomTypePerformanceDto> roomTypeBreakdown = roomTypes.stream()
                .map(rt -> {
                    long count = allRooms.stream().filter(r -> r.getRoomType() != null && r.getRoomType().getId().equals(rt.getId())).count();
                    long stays = reservations.stream().filter(r -> r.getRoom() != null && r.getRoom().getRoomType() != null && r.getRoom().getRoomType().getId().equals(rt.getId())).count();
                    BigDecimal rev = roomInvoices.stream()
                            .filter(i -> i.getHotelReservation() != null && i.getHotelReservation().getRoom() != null && i.getHotelReservation().getRoom().getRoomType() != null && i.getHotelReservation().getRoom().getRoomType().getId().equals(rt.getId()))
                            .map(i -> i.getTotalAmount() != null ? i.getTotalAmount() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    double util = totalRooms > 0 ? Math.round(((double) stays / Math.max(1, reservationsCount)) * 1000.0) / 10.0 : 0.0;

                    return RoomTypePerformanceDto.builder()
                            .roomTypeName(rt.getName())
                            .totalRoomsOfType(count)
                            .totalStays(stays)
                            .defaultPrice(rt.getDefaultPrice())
                            .generatedRevenue(rev)
                            .utilizationRate(util)
                            .build();
                })
                .collect(Collectors.toList());

        return HotelPerformanceReportDto.builder()
                .period(formatPeriod(startDate, endDate))
                .totalRooms(totalRooms)
                .occupiedRooms(occupiedRooms)
                .availableRooms(availableRooms)
                .occupancyRate(occupancyRate)
                .totalRoomRevenue(totalRoomRevenue)
                .averageDailyRate(adr)
                .revPar(revPar)
                .totalCheckIns(totalCheckIns)
                .totalCheckOuts(totalCheckOuts)
                .avgLengthOfStayDays(Math.round(avgStayDays * 10.0) / 10.0)
                .roomTypeBreakdown(roomTypeBreakdown)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public KitchenEfficiencyReportDto getKitchenEfficiencyReport(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();

        Instant startInstant = toStartOfDayInstant(startDate);
        Instant endInstant = toEndOfDayInstant(endDate);

        List<KitchenOrderEntity> kotList = kitchenOrderRepository.findAll().stream()
                .filter(k -> k.getStartTime() != null && !k.getStartTime().isBefore(startInstant) && !k.getStartTime().isAfter(endInstant))
                .collect(Collectors.toList());

        long totalPrepared = kotList.size();
        long onTimeCount = 0;
        long delayedCount = 0;
        double totalPrepMinutes = 0.0;
        long finishedOrdersCount = 0;

        for (KitchenOrderEntity kot : kotList) {
            if (kot.getStartTime() != null && kot.getEndTime() != null) {
                long minutes = Duration.between(kot.getStartTime(), kot.getEndTime()).toMinutes();
                totalPrepMinutes += minutes;
                finishedOrdersCount++;

                int targetTimer = kot.getPreparationTimer() != null && kot.getPreparationTimer() > 0 ? kot.getPreparationTimer() : 20;
                if (minutes <= targetTimer) {
                    onTimeCount++;
                } else {
                    delayedCount++;
                }
            } else {
                onTimeCount++;
            }
        }

        double avgPrepTime = finishedOrdersCount > 0 ? Math.round((totalPrepMinutes / finishedOrdersCount) * 10.0) / 10.0 : 15.0;
        double onTimeRate = totalPrepared > 0 ? Math.round(((double) onTimeCount / totalPrepared) * 1000.0) / 10.0 : 100.0;

        Map<String, List<KitchenOrderEntity>> byStation = kotList.stream()
                .collect(Collectors.groupingBy(k -> k.getStation() != null && !k.getStation().isBlank() ? k.getStation() : "Main Kitchen Station"));

        List<ChefStationPerformanceDto> stations = byStation.entrySet().stream()
                .map(entry -> {
                    long count = entry.getValue().size();
                    double stationMinutes = entry.getValue().stream()
                            .filter(k -> k.getStartTime() != null && k.getEndTime() != null)
                            .mapToLong(k -> Duration.between(k.getStartTime(), k.getEndTime()).toMinutes())
                            .average().orElse(15.0);

                    String chef = entry.getValue().stream()
                            .filter(k -> k.getAssignedChef() != null)
                            .map(k -> k.getAssignedChef().getName())
                            .findFirst().orElse("Chef Team");

                    return ChefStationPerformanceDto.builder()
                            .station(entry.getKey())
                            .ordersHandled(count)
                            .avgPrepTimeMinutes(Math.round(stationMinutes * 10.0) / 10.0)
                            .assignedChefName(chef)
                            .build();
                })
                .sorted((a, b) -> b.getOrdersHandled().compareTo(a.getOrdersHandled()))
                .collect(Collectors.toList());

        return KitchenEfficiencyReportDto.builder()
                .period(formatPeriod(startDate, endDate))
                .totalOrdersPrepared(totalPrepared)
                .averagePreparationTimeMinutes(avgPrepTime)
                .onTimeOrders(onTimeCount)
                .delayedOrders(delayedCount)
                .onTimeRatePercent(onTimeRate)
                .stationBreakdown(stations)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public StaffProductivityReportDto getStaffProductivityReport(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();

        Instant startInstant = toStartOfDayInstant(startDate);
        Instant endInstant = toEndOfDayInstant(endDate);

        List<UserEntity> allUsers = userRepository.findAll();
        List<OrderEntity> orders = orderRepository.findAll().stream()
                .filter(o -> !o.isDeleted() && o.getOrderTime() != null && !o.getOrderTime().isBefore(startInstant) && !o.getOrderTime().isAfter(endInstant))
                .collect(Collectors.toList());

        Map<UserEntity, List<OrderEntity>> byWaiter = orders.stream()
                .filter(o -> o.getAssignedWaiter() != null)
                .collect(Collectors.groupingBy(OrderEntity::getAssignedWaiter));

        List<WaiterSalesPerformanceDto> waiterSales = byWaiter.entrySet().stream()
                .map(entry -> {
                    BigDecimal totalSales = entry.getValue().stream().map(OrderEntity::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
                    long count = entry.getValue().size();
                    BigDecimal avgTicket = count > 0 ? totalSales.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
                    return WaiterSalesPerformanceDto.builder()
                            .waiterId(entry.getKey().getId())
                            .waiterName(entry.getKey().getName())
                            .ordersServed(count)
                            .totalSalesGenerated(totalSales)
                            .avgTicketSize(avgTicket)
                            .build();
                })
                .sorted((a, b) -> b.getTotalSalesGenerated().compareTo(a.getTotalSalesGenerated()))
                .collect(Collectors.toList());

        for (int i = 0; i < waiterSales.size(); i++) {
            waiterSales.get(i).setRank(i + 1);
        }

        final LocalDate attStart = startDate;
        final LocalDate attEnd = endDate;

        List<AttendanceEntity> attendanceList = attendanceRepository.findAll().stream()
                .filter(a -> a.getAttendanceDate() != null && !a.getAttendanceDate().isBefore(attStart) && !a.getAttendanceDate().isAfter(attEnd))
                .collect(Collectors.toList());

        LocalDate today = LocalDate.now();
        long presentToday = attendanceRepository.findAll().stream().filter(a -> today.equals(a.getAttendanceDate()) && a.getStatus() == AttendanceStatus.PRESENT).count();
        long absentToday = attendanceRepository.findAll().stream().filter(a -> today.equals(a.getAttendanceDate()) && a.getStatus() == AttendanceStatus.ABSENT).count();
        long lateToday = attendanceRepository.findAll().stream().filter(a -> today.equals(a.getAttendanceDate()) && a.getStatus() == AttendanceStatus.LATE).count();

        Map<UserEntity, List<AttendanceEntity>> byUser = attendanceList.stream()
                .collect(Collectors.groupingBy(AttendanceEntity::getUser));

        List<StaffAttendanceSummaryDto> attendanceSummary = allUsers.stream()
                .map(u -> {
                    List<AttendanceEntity> records = byUser.getOrDefault(u, Collections.emptyList());
                    long present = records.stream().filter(r -> r.getStatus() == AttendanceStatus.PRESENT).count();
                    long late = records.stream().filter(r -> r.getStatus() == AttendanceStatus.LATE).count();
                    long absent = records.stream().filter(r -> r.getStatus() == AttendanceStatus.ABSENT).count();

                    double hours = records.stream()
                            .filter(r -> r.getCheckInTime() != null && r.getCheckOutTime() != null)
                            .mapToDouble(r -> Duration.between(r.getCheckInTime(), r.getCheckOutTime()).toMinutes() / 60.0)
                            .sum();

                    return StaffAttendanceSummaryDto.builder()
                            .staffId(Long.valueOf(u.getId()))
                            .staffName(u.getName())
                            .roleName(u.getRole() != null ? u.getRole().getName() : "Staff")
                            .daysPresent(present)
                            .daysLate(late)
                            .daysAbsent(absent)
                            .totalHoursWorked(Math.round(hours * 10.0) / 10.0)
                            .build();
                })
                .sorted((a, b) -> b.getDaysPresent().compareTo(a.getDaysPresent()))
                .collect(Collectors.toList());

        return StaffProductivityReportDto.builder()
                .period(formatPeriod(startDate, endDate))
                .totalStaffMembers((long) allUsers.size())
                .totalPresentToday(presentToday)
                .totalAbsentToday(absentToday)
                .totalLateToday(lateToday)
                .waiterSales(waiterSales)
                .attendanceSummary(attendanceSummary)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerIntelligenceReportDto getCustomerIntelligenceReport() {
        List<CustomerEntity> allCustomers = customerRepository.findAll().stream().filter(c -> !c.isDeleted()).collect(Collectors.toList());
        long totalCustomers = allCustomers.size();

        List<InvoiceEntity> allInvoices = invoiceRepository.findAll();
        List<HotelReservationEntity> hotelRes = hotelReservationRepository.findAll();
        List<OrderEntity> allOrders = orderRepository.findAll().stream().filter(o -> !o.isDeleted()).collect(Collectors.toList());

        Map<Integer, Long> visitsMap = new HashMap<>();
        Map<Integer, BigDecimal> spendMap = new HashMap<>();

        for (OrderEntity order : allOrders) {
            if (order.getCustomer() != null) {
                int cid = order.getCustomer().getId();
                visitsMap.put(cid, visitsMap.getOrDefault(cid, 0L) + 1L);
            }
        }
        for (HotelReservationEntity hr : hotelRes) {
            if (hr.getCustomer() != null) {
                int cid = hr.getCustomer().getId();
                visitsMap.put(cid, visitsMap.getOrDefault(cid, 0L) + 1L);
            }
        }
        for (InvoiceEntity inv : allInvoices) {
            CustomerEntity cust = null;
            if (inv.getOrder() != null && inv.getOrder().getCustomer() != null) cust = inv.getOrder().getCustomer();
            else if (inv.getHotelReservation() != null && inv.getHotelReservation().getCustomer() != null) cust = inv.getHotelReservation().getCustomer();

            if (cust != null) {
                int cid = cust.getId();
                BigDecimal amt = inv.getTotalAmount() != null ? inv.getTotalAmount() : BigDecimal.ZERO;
                spendMap.put(cid, spendMap.getOrDefault(cid, BigDecimal.ZERO).add(amt));
            }
        }

        List<VipCustomerDto> topVips = allCustomers.stream()
                .map(c -> VipCustomerDto.builder()
                        .customerId(c.getId())
                        .customerName(c.getName())
                        .phone(c.getPhone() != null ? c.getPhone() : "N/A")
                        .nationality(c.getNationality() != null ? c.getNationality() : "Sri Lankan")
                        .loyaltyPoints(c.getLoyaltyPoints() != null ? c.getLoyaltyPoints() : 0)
                        .totalVisits(visitsMap.getOrDefault(c.getId(), 1L))
                        .lifetimeSpend(spendMap.getOrDefault(c.getId(), BigDecimal.ZERO))
                        .build())
                .sorted((a, b) -> b.getLifetimeSpend().compareTo(a.getLifetimeSpend()))
                .limit(20)
                .collect(Collectors.toList());

        long repeatCustomers = allCustomers.stream().filter(c -> visitsMap.getOrDefault(c.getId(), 0L) >= 2L).count();
        double repeatRate = totalCustomers > 0 ? Math.round(((double) repeatCustomers / totalCustomers) * 1000.0) / 10.0 : 0.0;
        long totalPoints = allCustomers.stream().mapToLong(c -> c.getLoyaltyPoints() != null ? c.getLoyaltyPoints() : 0).sum();

        Map<String, List<CustomerEntity>> byNat = allCustomers.stream()
                .collect(Collectors.groupingBy(c -> c.getNationality() != null && !c.getNationality().isBlank() ? c.getNationality() : "Sri Lankan"));

        List<NationalityDistributionDto> nationalityDistribution = byNat.entrySet().stream()
                .map(entry -> {
                    long count = entry.getValue().size();
                    double pct = totalCustomers > 0 ? Math.round(((double) count / totalCustomers) * 1000.0) / 10.0 : 0.0;
                    return NationalityDistributionDto.builder()
                            .nationality(entry.getKey())
                            .guestCount(count)
                            .percentage(pct)
                            .build();
                })
                .sorted((a, b) -> b.getGuestCount().compareTo(a.getGuestCount()))
                .collect(Collectors.toList());

        return CustomerIntelligenceReportDto.builder()
                .totalCustomers(totalCustomers)
                .totalLoyaltyPointsIssued(totalPoints)
                .repeatCustomerRatePercent(repeatRate)
                .topVipCustomers(topVips)
                .nationalityDistribution(nationalityDistribution)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public DiscountAuditReportDto getDiscountAuditReport(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();

        Instant startInstant = toStartOfDayInstant(startDate);
        Instant endInstant = toEndOfDayInstant(endDate);

        List<InvoiceEntity> invoices = invoiceRepository.findAll().stream()
                .filter(i -> i.getCreatedAt() != null && !i.getCreatedAt().isBefore(startInstant) && !i.getCreatedAt().isAfter(endInstant))
                .collect(Collectors.toList());

        List<InvoiceEntity> discountedInvoices = invoices.stream()
                .filter(i -> i.getDiscountAmount() != null && i.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0)
                .collect(Collectors.toList());

        BigDecimal totalDiscounts = discountedInvoices.stream().map(InvoiceEntity::getDiscountAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        long discountedCount = discountedInvoices.size();
        BigDecimal avgDiscount = discountedCount > 0 ? totalDiscounts.divide(BigDecimal.valueOf(discountedCount), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        List<InvoiceEntity> unpaidInvoices = invoices.stream()
                .filter(i -> "UNPAID".equalsIgnoreCase(i.getPaymentStatus()))
                .collect(Collectors.toList());
        BigDecimal unpaidTotal = unpaidInvoices.stream().map(i -> i.getTotalAmount() != null ? i.getTotalAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, List<InvoiceEntity>> byCashier = discountedInvoices.stream()
                .collect(Collectors.groupingBy(i -> i.getCreatedBy() != null && !i.getCreatedBy().isBlank() ? i.getCreatedBy() : "System / Manager"));

        List<CashierDiscountAuditDto> cashierDiscounts = byCashier.entrySet().stream()
                .map(entry -> {
                    BigDecimal discSum = entry.getValue().stream().map(InvoiceEntity::getDiscountAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal billSum = entry.getValue().stream().map(InvoiceEntity::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
                    return CashierDiscountAuditDto.builder()
                            .staffUsername(entry.getKey())
                            .billsDiscounted((long) entry.getValue().size())
                            .totalDiscountAmount(discSum)
                            .totalBillAmount(billSum)
                            .build();
                })
                .sorted((a, b) -> b.getTotalDiscountAmount().compareTo(a.getTotalDiscountAmount()))
                .collect(Collectors.toList());

        long vouchersCount = voucherRepository.findAll().stream().filter(v -> v.getUsageCount() > 0).count();

        return DiscountAuditReportDto.builder()
                .period(formatPeriod(startDate, endDate))
                .totalDiscountsGiven(totalDiscounts)
                .discountedInvoicesCount(discountedCount)
                .averageDiscountAmount(avgDiscount)
                .totalVouchersRedeemed(vouchersCount)
                .voucherDiscountTotal(totalDiscounts)
                .unpaidInvoicesCount((long) unpaidInvoices.size())
                .unpaidInvoicesTotal(unpaidTotal)
                .cashierDiscounts(cashierDiscounts)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateReportPdf(String reportType, LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();

        try {
            RestaurantSettingsDto settings = null;
            try {
                settings = settingsService.getSettings();
            } catch (Exception ignored) {}

            String restName = settings != null && settings.getRestaurantFullName() != null ? settings.getRestaurantFullName() : "Pol Kole Restaurant & Resort";
            String tagline = settings != null && settings.getTagline() != null ? settings.getTagline() : "DINE • STAY • ENJOY • FEELS LIKE HOME";
            String address = settings != null && settings.getAddress() != null ? settings.getAddress() : "Galle Road, Ahangama, Southern Province, Sri Lanka";
            String hotlinePhone = "Hotline: " + (settings != null && settings.getHotlinePhoneNumber() != null ? settings.getHotlinePhoneNumber() : "0777 222 222") + " | Phone: " + (settings != null && settings.getPhoneNumber() != null ? settings.getPhoneNumber() : "+94 91 228 3456");
            String contactWeb = "Email: " + (settings != null && settings.getEmail() != null ? settings.getEmail() : "info@pk.lk") + " | Web: " + (settings != null && settings.getWebsite() != null ? settings.getWebsite() : "www.polkole.lk") + " • BRN: " + (settings != null && settings.getTaxNumber() != null ? settings.getTaxNumber() : "PV-98234-LK");

            Map<String, Object> parameters = new HashMap<>();
            parameters.put("restaurantName", restName);
            parameters.put("tagline", tagline);
            parameters.put("address", address);
            parameters.put("hotlinePhone", hotlinePhone);
            parameters.put("contactWeb", contactWeb);

            try (java.io.InputStream logoIs = getClass().getResourceAsStream("/reports/polkolelogo.png")) {
                if (logoIs != null) {
                    parameters.put("logoImage", javax.imageio.ImageIO.read(logoIs));
                }
            } catch (Exception ignored) {}
            parameters.put("period", formatPeriod(startDate, endDate));
            parameters.put("printedAt", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

            List<Map<String, Object>> tableRows = new ArrayList<>();
            String reportTitle;
            String kpi1Label = "";
            String kpi1Value = "";
            String kpi2Label = "";
            String kpi2Value = "";

            if ("menu".equalsIgnoreCase(reportType)) {
                reportTitle = "Full Menu Item Sales & Performance Report";
                MenuSalesReportDto report = getMenuSalesReport(startDate, endDate);
                kpi1Label = "Total Menu Revenue";
                kpi1Value = "Rs. " + String.format("%,.2f", report.getTotalMenuRevenue());
                kpi2Label = "Total Units Sold";
                kpi2Value = String.valueOf(report.getTotalUnitsSold());

                for (MenuItemSalesDto item : report.getFullMenuList()) {
                    Map<String, Object> r = new HashMap<>();
                    r.put("col1", item.getItemName());
                    r.put("col2", item.getCategoryName());
                    r.put("col3", "Rs. " + String.format("%,.2f", item.getUnitPrice()));
                    r.put("col4", String.valueOf(item.getQuantitySold()));
                    r.put("col5", "Rs. " + String.format("%,.2f", item.getTotalRevenue()));
                    r.put("col6", item.getPerformanceTag());
                    tableRows.add(r);
                }
            } else if ("hotel".equalsIgnoreCase(reportType)) {
                reportTitle = "Hotel Accommodation & Yield Analysis Report";
                HotelPerformanceReportDto report = getHotelPerformanceReport(startDate, endDate);
                kpi1Label = "Total Room Revenue";
                kpi1Value = "Rs. " + String.format("%,.2f", report.getTotalRoomRevenue());
                kpi2Label = "Occupancy Rate";
                kpi2Value = report.getOccupancyRate() + "%";

                for (RoomTypePerformanceDto rt : report.getRoomTypeBreakdown()) {
                    Map<String, Object> r = new HashMap<>();
                    r.put("col1", rt.getRoomTypeName());
                    r.put("col2", rt.getTotalRoomsOfType() + " rooms");
                    r.put("col3", "Rs. " + String.format("%,.2f", rt.getDefaultPrice()));
                    r.put("col4", rt.getTotalStays() + " stays");
                    r.put("col5", "Rs. " + String.format("%,.2f", rt.getGeneratedRevenue()));
                    r.put("col6", rt.getUtilizationRate() + "% Utilized");
                    tableRows.add(r);
                }
            } else if ("staff".equalsIgnoreCase(reportType)) {
                reportTitle = "Staff Productivity & Waiter Sales Report";
                StaffProductivityReportDto report = getStaffProductivityReport(startDate, endDate);
                kpi1Label = "Active Staff Members";
                kpi1Value = String.valueOf(report.getTotalStaffMembers());
                kpi2Label = "Staff On Duty Today";
                kpi2Value = String.valueOf(report.getTotalPresentToday());

                for (WaiterSalesPerformanceDto w : report.getWaiterSales()) {
                    Map<String, Object> r = new HashMap<>();
                    r.put("col1", "#" + w.getRank() + " " + w.getWaiterName());
                    r.put("col2", "Floor Waiter");
                    r.put("col3", w.getOrdersServed() + " orders");
                    r.put("col4", "Rs. " + String.format("%,.2f", w.getAvgTicketSize()));
                    r.put("col5", "Rs. " + String.format("%,.2f", w.getTotalSalesGenerated()));
                    r.put("col6", "Rank #" + w.getRank());
                    tableRows.add(r);
                }
            } else if ("customer".equalsIgnoreCase(reportType)) {
                reportTitle = "Customer VIP Intelligence & Loyalty Report";
                CustomerIntelligenceReportDto report = getCustomerIntelligenceReport();
                kpi1Label = "Total Registered Guests";
                kpi1Value = String.valueOf(report.getTotalCustomers());
                kpi2Label = "Repeat Guest Rate";
                kpi2Value = report.getRepeatCustomerRatePercent() + "%";

                for (VipCustomerDto vip : report.getTopVipCustomers()) {
                    Map<String, Object> r = new HashMap<>();
                    r.put("col1", vip.getCustomerName());
                    r.put("col2", vip.getPhone());
                    r.put("col3", vip.getNationality());
                    r.put("col4", vip.getTotalVisits() + " visits");
                    r.put("col5", "Rs. " + String.format("%,.2f", vip.getLifetimeSpend()));
                    r.put("col6", vip.getLoyaltyPoints() + " pts");
                    tableRows.add(r);
                }
            } else if ("audit".equalsIgnoreCase(reportType)) {
                reportTitle = "Loss Prevention & Discount Audit Report";
                DiscountAuditReportDto report = getDiscountAuditReport(startDate, endDate);
                kpi1Label = "Total Discounts Given";
                kpi1Value = "Rs. " + String.format("%,.2f", report.getTotalDiscountsGiven());
                kpi2Label = "Discounted Invoices";
                kpi2Value = String.valueOf(report.getDiscountedInvoicesCount());

                for (CashierDiscountAuditDto c : report.getCashierDiscounts()) {
                    Map<String, Object> r = new HashMap<>();
                    r.put("col1", c.getStaffUsername());
                    r.put("col2", "Cashier / Staff");
                    r.put("col3", c.getBillsDiscounted() + " bills");
                    r.put("col4", "-");
                    r.put("col5", "Rs. " + String.format("%,.2f", c.getTotalDiscountAmount()));
                    r.put("col6", "Rs. " + String.format("%,.2f", c.getTotalBillAmount()));
                    tableRows.add(r);
                }
            } else {
                reportTitle = "Daily Flash & Financial Settlement Report";
                DailyFlashReportDto report = getDailyFlashReport(startDate, endDate);
                kpi1Label = "Net Revenue";
                kpi1Value = "Rs. " + String.format("%,.2f", report.getNetRevenue());
                kpi2Label = "Gross Sales";
                kpi2Value = "Rs. " + String.format("%,.2f", report.getGrossSales());

                for (ChannelRevenueDto ch : report.getChannelRevenues()) {
                    Map<String, Object> r = new HashMap<>();
                    r.put("col1", ch.getChannel());
                    r.put("col2", "Revenue Stream");
                    r.put("col3", ch.getCount() + " tickets");
                    r.put("col4", ch.getPercentage() + "%");
                    r.put("col5", "Rs. " + String.format("%,.2f", ch.getTotalRevenue()));
                    r.put("col6", "Channel Split");
                    tableRows.add(r);
                }
            }

            parameters.put("reportTitle", reportTitle);
            parameters.put("kpi1Label", kpi1Label);
            parameters.put("kpi1Value", kpi1Value);
            parameters.put("kpi2Label", kpi2Label);
            parameters.put("kpi2Value", kpi2Value);

            InputStream is = getClass().getResourceAsStream("/reports/enterprise_report.jrxml");
            if (is == null) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Report template not found: /reports/enterprise_report.jrxml");
            }

            JasperDesign jasperDesign = JRXmlLoader.load(is);
            JasperReport jasperReport = JasperCompileManager.compileReport(jasperDesign);

            JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(tableRows);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);

            return JasperExportManager.exportReportToPdf(jasperPrint);
        } catch (Exception e) {
            e.printStackTrace();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error generating report PDF: " + e.getMessage());
        }
    }

    // ==========================================
    // GENERIC AI REPORTING CAPABILITIES
    // ==========================================

    @Override
    @Transactional(readOnly = true)
    public SalesReportDto getSalesReport(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();

        Instant startInstant = toStartOfDayInstant(startDate);
        Instant endInstant = toEndOfDayInstant(endDate);

        List<InvoiceEntity> invoices = invoiceRepository.findAll().stream()
                .filter(i -> i.getCreatedAt() != null && !i.getCreatedAt().isBefore(startInstant) && !i.getCreatedAt().isAfter(endInstant))
                .collect(Collectors.toList());

        BigDecimal grossSales = invoices.stream().map(i -> i.getOrderSubtotal() != null ? i.getOrderSubtotal() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalTax = invoices.stream().map(i -> i.getTaxAmount() != null ? i.getTaxAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalDiscounts = invoices.stream().map(i -> i.getDiscountAmount() != null ? i.getDiscountAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal netRevenue = invoices.stream().map(i -> i.getTotalAmount() != null ? i.getTotalAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);

        List<OrderEntity> orders = orderRepository.findAll().stream()
                .filter(o -> !o.isDeleted() && o.getOrderTime() != null && !o.getOrderTime().isBefore(startInstant) && !o.getOrderTime().isAfter(endInstant))
                .collect(Collectors.toList());

        long totalOrders = orders.size();
        long totalInvoices = invoices.size();
        BigDecimal avgOrderValue = totalInvoices > 0 ? netRevenue.divide(BigDecimal.valueOf(totalInvoices), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        BigDecimal dineInRevenue = BigDecimal.ZERO;
        BigDecimal takeawayRevenue = BigDecimal.ZERO;
        BigDecimal roomServiceRevenue = BigDecimal.ZERO;
        BigDecimal hotelStayRevenue = BigDecimal.ZERO;

        for (InvoiceEntity inv : invoices) {
            BigDecimal amt = inv.getTotalAmount() != null ? inv.getTotalAmount() : BigDecimal.ZERO;
            if (inv.getOrder() != null) {
                if (inv.getOrder().getTable() != null) {
                    dineInRevenue = dineInRevenue.add(amt);
                } else if (inv.getOrder().getRoom() != null) {
                    roomServiceRevenue = roomServiceRevenue.add(amt);
                } else {
                    takeawayRevenue = takeawayRevenue.add(amt);
                }
            } else if (inv.getHotelReservation() != null) {
                hotelStayRevenue = hotelStayRevenue.add(amt);
            }
        }

        List<ItemSalesDto> topSelling = getItemSalesReport(null, startDate, endDate, SortDirection.DESC, 5);
        List<ItemSalesDto> leastSelling = getItemSalesReport(null, startDate, endDate, SortDirection.ASC, 5);

        return SalesReportDto.builder()
                .period(formatPeriod(startDate, endDate))
                .grossSales(grossSales)
                .totalTax(totalTax)
                .totalDiscounts(totalDiscounts)
                .netRevenue(netRevenue)
                .totalOrders(totalOrders)
                .totalInvoices(totalInvoices)
                .averageOrderValue(avgOrderValue)
                .dineInRevenue(dineInRevenue)
                .takeawayRevenue(takeawayRevenue)
                .roomServiceRevenue(roomServiceRevenue)
                .hotelStayRevenue(hotelStayRevenue)
                .topSellingItems(topSelling)
                .leastSellingItems(leastSelling)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ItemSalesDto> getItemSalesReport(String category, LocalDate startDate, LocalDate endDate, SortDirection sortDirection, Integer limit) {
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();
        if (sortDirection == null) sortDirection = SortDirection.DESC;
        int maxResults = (limit != null && limit > 0) ? limit : 10;

        Instant startInstant = toStartOfDayInstant(startDate);
        Instant endInstant = toEndOfDayInstant(endDate);

        List<MenuItemEntity> allMenuItems = menuItemRepository.findAll().stream()
                .filter(m -> !m.isDeleted())
                .collect(Collectors.toList());

        if (category != null && !category.isBlank()) {
            String catClean = category.trim().toLowerCase();
            allMenuItems = allMenuItems.stream()
                    .filter(m -> m.getCategory() != null && m.getCategory().getName().toLowerCase().contains(catClean))
                    .collect(Collectors.toList());
        }

        List<OrderEntity> completedOrders = orderRepository.findAll().stream()
                .filter(o -> !o.isDeleted() && o.getOrderTime() != null 
                        && !o.getOrderTime().isBefore(startInstant) && !o.getOrderTime().isAfter(endInstant)
                        && o.getStatus() != null && !"CANCELLED".equalsIgnoreCase(o.getStatus().getName()))
                .collect(Collectors.toList());

        Map<Integer, Long> quantityMap = new HashMap<>();
        Map<Integer, BigDecimal> revenueMap = new HashMap<>();

        for (OrderEntity order : completedOrders) {
            if (order.getItems() != null) {
                for (OrderItemEntity oi : order.getItems()) {
                    if (oi.getMenuItem() != null) {
                        int itemId = oi.getMenuItem().getId();
                        long qty = oi.getQuantity() != null ? oi.getQuantity() : 1L;
                        BigDecimal price = oi.getPrice() != null ? oi.getPrice() : (oi.getMenuItem().getPrice() != null ? oi.getMenuItem().getPrice() : BigDecimal.ZERO);
                        BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(qty));

                        quantityMap.put(itemId, quantityMap.getOrDefault(itemId, 0L) + qty);
                        revenueMap.put(itemId, revenueMap.getOrDefault(itemId, BigDecimal.ZERO).add(lineTotal));
                    }
                }
            }
        }

        BigDecimal totalSalesRevenue = revenueMap.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);

        List<ItemSalesDto> list = allMenuItems.stream().map(m -> {
            long qty = quantityMap.getOrDefault(m.getId(), 0L);
            BigDecimal rev = revenueMap.getOrDefault(m.getId(), BigDecimal.ZERO);
            double contrib = totalSalesRevenue.compareTo(BigDecimal.ZERO) > 0 
                    ? rev.divide(totalSalesRevenue, 4, RoundingMode.HALF_UP).doubleValue() * 100.0 : 0.0;

            String tag;
            if (qty == 0) tag = "Zero Sales";
            else if (qty >= 50) tag = "Top Seller";
            else if (qty >= 15) tag = "Moderate";
            else tag = "Slow Moving";

            return ItemSalesDto.builder()
                    .itemId(m.getId())
                    .itemName(m.getName())
                    .categoryName(m.getCategory() != null ? m.getCategory().getName() : "General")
                    .unitPrice(m.getPrice())
                    .quantitySold(qty)
                    .totalRevenue(rev)
                    .salesContributionPercent(Math.round(contrib * 100.0) / 100.0)
                    .isAvailable(m.isAvailable())
                    .performanceTag(tag)
                    .build();
        }).collect(Collectors.toList());

        final SortDirection dir = sortDirection;
        list.sort((a, b) -> {
            if (dir == SortDirection.ASC) {
                int cmp = a.getQuantitySold().compareTo(b.getQuantitySold());
                return cmp != 0 ? cmp : a.getTotalRevenue().compareTo(b.getTotalRevenue());
            } else {
                int cmp = b.getQuantitySold().compareTo(a.getQuantitySold());
                return cmp != 0 ? cmp : b.getTotalRevenue().compareTo(a.getTotalRevenue());
            }
        });

        return list.stream().limit(maxResults).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public OrderStatisticsDto getOrderStatistics(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();

        Instant startInstant = toStartOfDayInstant(startDate);
        Instant endInstant = toEndOfDayInstant(endDate);

        List<OrderEntity> orders = orderRepository.findAll().stream()
                .filter(o -> !o.isDeleted() && o.getOrderTime() != null 
                        && !o.getOrderTime().isBefore(startInstant) && !o.getOrderTime().isAfter(endInstant))
                .collect(Collectors.toList());

        long total = orders.size();
        long completed = orders.stream().filter(o -> o.getStatus() != null && "COMPLETED".equalsIgnoreCase(o.getStatus().getName())).count();
        long cancelled = orders.stream().filter(o -> o.getStatus() != null && "CANCELLED".equalsIgnoreCase(o.getStatus().getName())).count();
        long active = total - completed - cancelled;

        long dineIn = orders.stream().filter(o -> o.getTable() != null).count();
        long roomService = orders.stream().filter(o -> o.getRoom() != null).count();
        long takeaway = orders.stream().filter(o -> o.getTable() == null && o.getRoom() == null).count();

        BigDecimal totalVal = orders.stream()
                .map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal avgTicket = total > 0 ? totalVal.divide(BigDecimal.valueOf(total), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        Map<LocalDate, Long> dayCounts = orders.stream()
                .collect(Collectors.groupingBy(o -> LocalDate.ofInstant(o.getOrderTime(), SYSTEM_ZONE), Collectors.counting()));

        String busiestDay = "N/A";
        long busiestCount = 0L;
        for (Map.Entry<LocalDate, Long> entry : dayCounts.entrySet()) {
            if (entry.getValue() > busiestCount) {
                busiestCount = entry.getValue();
                busiestDay = entry.getKey().toString();
            }
        }

        return OrderStatisticsDto.builder()
                .period(formatPeriod(startDate, endDate))
                .totalOrders(total)
                .completedOrders(completed)
                .activeOrders(active)
                .cancelledOrders(cancelled)
                .dineInOrders(dineIn)
                .takeawayOrders(takeaway)
                .roomServiceOrders(roomService)
                .totalOrderValue(totalVal)
                .averageTicketSize(avgTicket)
                .busiestDay(busiestDay)
                .busiestDayOrderCount(busiestCount)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RestaurantTableDto> getAvailableTables() {
        return restaurantTableRepository.findAll().stream()
                .filter(t -> !t.isDeleted() && "Available".equalsIgnoreCase(t.getStatus()))
                .map(t -> RestaurantTableDto.builder()
                        .id(t.getId())
                        .tableNumber(t.getTableNumber())
                        .capacity(t.getCapacity())
                        .status(t.getStatus())
                        .locationId(t.getLocation() != null ? t.getLocation().getId() : null)
                        .locationName(t.getLocation() != null ? t.getLocation().getName() : "Main Area")
                        .locationCode(t.getLocation() != null ? t.getLocation().getCode() : "MAIN")
                        .isAvailableForReservation(t.isAvailableForReservation())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TablePerformanceDto> getTablePerformance(LocalDate startDate, LocalDate endDate, SortDirection sortDirection, Integer limit) {
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();
        if (sortDirection == null) sortDirection = SortDirection.DESC;
        int max = (limit != null && limit > 0) ? limit : 10;

        Instant startInstant = toStartOfDayInstant(startDate);
        Instant endInstant = toEndOfDayInstant(endDate);

        List<OrderEntity> orders = orderRepository.findAll().stream()
                .filter(o -> !o.isDeleted() && o.getTable() != null 
                        && o.getOrderTime() != null && !o.getOrderTime().isBefore(startInstant) && !o.getOrderTime().isAfter(endInstant))
                .collect(Collectors.toList());

        Map<RestaurantTableEntity, List<OrderEntity>> byTable = orders.stream()
                .collect(Collectors.groupingBy(OrderEntity::getTable));

        List<TablePerformanceDto> result = byTable.entrySet().stream().map(entry -> {
            RestaurantTableEntity t = entry.getKey();
            List<OrderEntity> list = entry.getValue();
            long count = list.size();
            BigDecimal rev = list.stream().map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal avg = count > 0 ? rev.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

            return TablePerformanceDto.builder()
                    .tableId(t.getId())
                    .tableNumber(t.getTableNumber())
                    .location(t.getLocation() != null ? t.getLocation().getName() : "Main Dining")
                    .capacity(t.getCapacity())
                    .ordersServed(count)
                    .totalRevenue(rev)
                    .avgSpendPerOrder(avg)
                    .status(t.getStatus())
                    .build();
        }).collect(Collectors.toList());

        final SortDirection dir = sortDirection;
        result.sort((a, b) -> dir == SortDirection.ASC ? a.getTotalRevenue().compareTo(b.getTotalRevenue()) : b.getTotalRevenue().compareTo(a.getTotalRevenue()));

        return result.stream().limit(max).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomRevenueDto> getRoomRevenue(LocalDate startDate, LocalDate endDate) {
        final LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        final LocalDate end = endDate != null ? endDate : LocalDate.now();

        List<RoomEntity> allRooms = roomRepository.findAll().stream().filter(r -> !r.isDeleted()).collect(Collectors.toList());
        List<HotelReservationEntity> reservations = hotelReservationRepository.findAll().stream()
                .filter(r -> r.getCheckInDate() != null && !r.getCheckInDate().isAfter(end)
                        && r.getCheckOutDate() != null && !r.getCheckOutDate().isBefore(start))
                .collect(Collectors.toList());

        Map<Integer, List<HotelReservationEntity>> byRoom = reservations.stream()
                .filter(r -> r.getRoom() != null)
                .collect(Collectors.groupingBy(r -> r.getRoom().getId()));

        long daysBetween = ChronoUnit.DAYS.between(start, end) + 1;

        return allRooms.stream().map(room -> {
            List<HotelReservationEntity> roomRes = byRoom.getOrDefault(room.getId(), Collections.emptyList());
            long stays = roomRes.size();
            BigDecimal price = room.getRoomType() != null && room.getRoomType().getDefaultPrice() != null ? room.getRoomType().getDefaultPrice() : BigDecimal.ZERO;
            BigDecimal rev = price.multiply(BigDecimal.valueOf(stays));

            long occupiedNights = roomRes.stream().mapToLong(r -> {
                LocalDate cin = r.getCheckInDate().isBefore(start) ? start : r.getCheckInDate();
                LocalDate cout = r.getCheckOutDate().isAfter(end) ? end : r.getCheckOutDate();
                long n = ChronoUnit.DAYS.between(cin, cout);
                return n > 0 ? n : 1L;
            }).sum();

            double occ = daysBetween > 0 ? Math.min(100.0, Math.round(((double) occupiedNights / daysBetween) * 1000.0) / 10.0) : 0.0;

            return RoomRevenueDto.builder()
                    .roomId(room.getId())
                    .roomNumber(room.getRoomNumber())
                    .roomType(room.getRoomType() != null ? room.getRoomType().getName() : "Standard")
                    .defaultPrice(price)
                    .totalStays(stays)
                    .generatedRevenue(rev)
                    .occupancyRate(occ)
                    .build();
        }).sorted((a, b) -> b.getGeneratedRevenue().compareTo(a.getGeneratedRevenue())).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ReservationStatisticsDto getReservationStatistics(LocalDate startDate, LocalDate endDate) {
        final LocalDate start = startDate != null ? startDate : LocalDate.now().minusDays(30);
        final LocalDate end = endDate != null ? endDate : LocalDate.now();

        List<ReservationEntity> tableRes = reservationRepository.findAll().stream()
                .filter(r -> r.getReservationDate() != null && !r.getReservationDate().isBefore(start) && !r.getReservationDate().isAfter(end))
                .collect(Collectors.toList());

        long totalTable = tableRes.size();
        long confirmedTable = tableRes.stream().filter(r -> r.getReservationStatus() != null && "Confirmed".equalsIgnoreCase(r.getReservationStatus().getStatusName())).count();
        long cancelledTable = tableRes.stream().filter(r -> r.getReservationStatus() != null && "Cancelled".equalsIgnoreCase(r.getReservationStatus().getStatusName())).count();

        List<HotelReservationEntity> hotelRes = hotelReservationRepository.findAll().stream()
                .filter(r -> r.getCheckInDate() != null && !r.getCheckInDate().isAfter(end)
                        && r.getCheckOutDate() != null && !r.getCheckOutDate().isBefore(start))
                .collect(Collectors.toList());

        long totalHotel = hotelRes.size();
        long confirmedHotel = hotelRes.stream().filter(r -> r.getStatus() != null && ("CONFIRMED".equalsIgnoreCase(r.getStatus()) || "Confirmed".equalsIgnoreCase(r.getStatus()))).count();
        long checkedInHotel = hotelRes.stream().filter(r -> r.getStatus() != null && ("CHECKED_IN".equalsIgnoreCase(r.getStatus()) || "Checked In".equalsIgnoreCase(r.getStatus()))).count();
        long checkedOutHotel = hotelRes.stream().filter(r -> r.getStatus() != null && ("CHECKED_OUT".equalsIgnoreCase(r.getStatus()) || "Checked Out".equalsIgnoreCase(r.getStatus()))).count();

        return ReservationStatisticsDto.builder()
                .period(formatPeriod(startDate, endDate))
                .totalTableReservations(totalTable)
                .confirmedTableReservations(confirmedTable)
                .cancelledTableReservations(cancelledTable)
                .totalHotelReservations(totalHotel)
                .confirmedHotelReservations(confirmedHotel)
                .checkedInHotelReservations(checkedInHotel)
                .checkedOutHotelReservations(checkedOutHotel)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public TakeawayStatisticsDto getTakeawayStatistics(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();

        Instant startInstant = toStartOfDayInstant(startDate);
        Instant endInstant = toEndOfDayInstant(endDate);

        List<OrderEntity> takeawayOrders = orderRepository.findAll().stream()
                .filter(o -> !o.isDeleted() && o.getTable() == null && o.getRoom() == null
                        && o.getOrderTime() != null && !o.getOrderTime().isBefore(startInstant) && !o.getOrderTime().isAfter(endInstant))
                .collect(Collectors.toList());

        long totalTakeaway = takeawayOrders.size();
        BigDecimal rev = takeawayOrders.stream().map(o -> o.getTotalAmount() != null ? o.getTotalAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal avg = totalTakeaway > 0 ? rev.divide(BigDecimal.valueOf(totalTakeaway), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;

        Map<MenuItemEntity, Long> itemCounts = new HashMap<>();
        for (OrderEntity o : takeawayOrders) {
            if (o.getItems() != null) {
                for (OrderItemEntity oi : o.getItems()) {
                    if (oi.getMenuItem() != null) {
                        itemCounts.put(oi.getMenuItem(), itemCounts.getOrDefault(oi.getMenuItem(), 0L) + (oi.getQuantity() != null ? oi.getQuantity() : 1L));
                    }
                }
            }
        }

        List<ItemSalesDto> topItems = itemCounts.entrySet().stream()
                .map(e -> ItemSalesDto.builder()
                        .itemId(e.getKey().getId())
                        .itemName(e.getKey().getName())
                        .categoryName(e.getKey().getCategory() != null ? e.getKey().getCategory().getName() : "Takeaway")
                        .quantitySold(e.getValue())
                        .unitPrice(e.getKey().getPrice())
                        .totalRevenue(e.getKey().getPrice() != null ? e.getKey().getPrice().multiply(BigDecimal.valueOf(e.getValue())) : BigDecimal.ZERO)
                        .build())
                .sorted((a, b) -> b.getQuantitySold().compareTo(a.getQuantitySold()))
                .limit(5)
                .collect(Collectors.toList());

        return TakeawayStatisticsDto.builder()
                .period(formatPeriod(startDate, endDate))
                .totalTakeawayOrders(totalTakeaway)
                .totalTakeawayRevenue(rev)
                .averageTakeawayValue(avg)
                .topTakeawayItems(topItems)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ItemSalesDto> getPopularItems(String category, LocalDate startDate, LocalDate endDate, Integer limit) {
        return getItemSalesReport(category, startDate, endDate, SortDirection.DESC, limit != null ? limit : 5);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DailyRevenueDto> getDailyRevenue(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();

        Instant startInstant = toStartOfDayInstant(startDate);
        Instant endInstant = toEndOfDayInstant(endDate);

        List<InvoiceEntity> invoices = invoiceRepository.findAll().stream()
                .filter(i -> i.getCreatedAt() != null && !i.getCreatedAt().isBefore(startInstant) && !i.getCreatedAt().isAfter(endInstant))
                .collect(Collectors.toList());

        Map<LocalDate, List<InvoiceEntity>> byDate = invoices.stream()
                .collect(Collectors.groupingBy(i -> LocalDate.ofInstant(i.getCreatedAt(), SYSTEM_ZONE)));

        List<DailyRevenueDto> list = new ArrayList<>();
        LocalDate cur = startDate;
        while (!cur.isAfter(endDate)) {
            List<InvoiceEntity> dayInvoices = byDate.getOrDefault(cur, Collections.emptyList());
            BigDecimal gross = dayInvoices.stream().map(i -> i.getOrderSubtotal() != null ? i.getOrderSubtotal() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal net = dayInvoices.stream().map(i -> i.getTotalAmount() != null ? i.getTotalAmount() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);

            list.add(DailyRevenueDto.builder()
                    .date(cur.toString())
                    .grossRevenue(gross)
                    .netRevenue(net)
                    .orderCount((long) dayInvoices.size())
                    .topSellingItem("-")
                    .build());
            cur = cur.plusDays(1);
        }

        return list;
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateAiReportPdf(String reportType, LocalDate startDate, LocalDate endDate, AiReportAnalysisDto aiAnalysis) {
        if (startDate == null) startDate = LocalDate.now().minusDays(30);
        if (endDate == null) endDate = LocalDate.now();

        try {
            RestaurantSettingsDto settings = null;
            try {
                settings = settingsService.getSettings();
            } catch (Exception ignored) {}

            String restName = settings != null && settings.getRestaurantFullName() != null ? settings.getRestaurantFullName() : "Pol Kole Restaurant & Resort";
            String tagline = settings != null && settings.getTagline() != null ? settings.getTagline() : "DINE • STAY • ENJOY • FEELS LIKE HOME";
            String address = settings != null && settings.getAddress() != null ? settings.getAddress() : "Galle Road, Ahangama, Southern Province, Sri Lanka";
            String hotlinePhone = "Hotline: " + (settings != null && settings.getHotlinePhoneNumber() != null ? settings.getHotlinePhoneNumber() : "0777 222 222") + " | Phone: " + (settings != null && settings.getPhoneNumber() != null ? settings.getPhoneNumber() : "+94 91 228 3456");
            String contactWeb = "Email: " + (settings != null && settings.getEmail() != null ? settings.getEmail() : "info@pk.lk") + " | Web: " + (settings != null && settings.getWebsite() != null ? settings.getWebsite() : "www.polkole.lk") + " • BRN: " + (settings != null && settings.getTaxNumber() != null ? settings.getTaxNumber() : "PV-98234-LK");

            Map<String, Object> parameters = new HashMap<>();
            parameters.put("restaurantName", restName);
            parameters.put("tagline", tagline);
            parameters.put("address", address);
            parameters.put("hotlinePhone", hotlinePhone);
            parameters.put("contactWeb", contactWeb);

            try (java.io.InputStream logoIs = getClass().getResourceAsStream("/reports/polkolelogo.png")) {
                if (logoIs != null) {
                    parameters.put("logoImage", javax.imageio.ImageIO.read(logoIs));
                }
            } catch (Exception ignored) {}
            parameters.put("period", formatPeriod(startDate, endDate));
            parameters.put("printedAt", LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));

            if (aiAnalysis != null) {
                parameters.put("aiSummary", aiAnalysis.getSummary());
                parameters.put("aiInsight", aiAnalysis.getPeriodComparison() != null ? aiAnalysis.getPeriodComparison() : "Analysis based on audited transactional data.");
                parameters.put("aiRecommendation", aiAnalysis.getRecommendation());
                parameters.put("topSellingItem", aiAnalysis.getTopSellingItem());
                parameters.put("leastSellingItem", aiAnalysis.getLeastSellingItem());
                parameters.put("revenueGrowth", aiAnalysis.getRevenueChangePercent() != null ? aiAnalysis.getRevenueChangePercent() + "%" : "N/A");
            }

            SalesReportDto sales = getSalesReport(startDate, endDate);
            parameters.put("reportTitle", "AI-Powered Executive Business & Revenue Intelligence");
            parameters.put("kpi1Label", "Net Revenue");
            parameters.put("kpi1Value", "Rs. " + String.format("%,.2f", sales.getNetRevenue()));
            parameters.put("kpi2Label", "Gross Sales");
            parameters.put("kpi2Value", "Rs. " + String.format("%,.2f", sales.getGrossSales()));

            List<Map<String, Object>> tableRows = new ArrayList<>();
            List<ItemSalesDto> items = getItemSalesReport(null, startDate, endDate, SortDirection.DESC, 15);
            for (ItemSalesDto it : items) {
                Map<String, Object> r = new HashMap<>();
                r.put("col1", it.getItemName());
                r.put("col2", it.getCategoryName());
                r.put("col3", "Rs. " + String.format("%,.2f", it.getUnitPrice() != null ? it.getUnitPrice() : BigDecimal.ZERO));
                r.put("col4", it.getQuantitySold() + " sold");
                r.put("col5", "Rs. " + String.format("%,.2f", it.getTotalRevenue()));
                r.put("col6", it.getPerformanceTag());
                tableRows.add(r);
            }

            InputStream is = getClass().getResourceAsStream("/reports/enterprise_ai_report.jrxml");
            if (is == null) {
                is = getClass().getResourceAsStream("/reports/enterprise_report.jrxml");
            }
            if (is == null) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Report template not found");
            }

            JasperDesign jasperDesign = JRXmlLoader.load(is);
            JasperReport jasperReport = JasperCompileManager.compileReport(jasperDesign);

            JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(tableRows);
            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, parameters, dataSource);

            return JasperExportManager.exportReportToPdf(jasperPrint);
        } catch (Exception e) {
            e.printStackTrace();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error generating AI report PDF: " + e.getMessage());
        }
    }

}
