package com.rms.polkole.service.impl;

import com.rms.polkole.dto.InvoiceDto;
import com.rms.polkole.dto.InvoiceItemDto;
import com.rms.polkole.dto.PaymentDto;
import com.rms.polkole.entity.*;
import com.rms.polkole.repository.*;
import com.rms.polkole.service.BillingService;
import com.rms.polkole.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class BillingServiceImpl implements BillingService {

    private final InvoiceRepository invoiceRepository;
    private final InvoiceItemRepository invoiceItemRepository;
    private final OrderRepository orderRepository;
    private final DiscountRepository discountRepository;
    private final TaxRepository taxRepository;
    private final PaymentMethodRepository paymentMethodRepository;
    private final PaymentRepository paymentRepository;
    private final CustomerRepository customerRepository;
    private final LoyaltyPointRepository loyaltyPointRepository;
    private final InventoryItemRepository inventoryItemRepository;
    private final StockTransactionRepository stockTransactionRepository;
    private final OrderService orderService;
    private final HotelReservationRepository hotelReservationRepository;
    private final RoomRepository roomRepository;
    private final CheckOutRepository checkOutRepository;
    private final OrderStatusRepository statusRepository;
    private final ReservationRepository tableReservationRepository;
    private final RestaurantTableRepository tableRepository;
    private final ReservationStatusRepository tableStatusRepository;
    private final ModelMapper mapper;

    @Override
    @Transactional
    public InvoiceDto generateInvoice(Integer orderId, String discountCode, int redeemPoints) {
        OrderEntity order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with ID: " + orderId));

        if (invoiceRepository.findByOrderId(orderId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Invoice already generated for order: " + orderId);
        }

        BigDecimal orderSubtotal = order.getTotalAmount();
        List<InvoiceItemEntity> items = new ArrayList<>();

        for (OrderItemEntity orderItem : order.getItems()) {
            items.add(InvoiceItemEntity.builder()
                    .description(orderItem.getMenuItem().getName())
                    .quantity(orderItem.getQuantity())
                    .unitPrice(orderItem.getPrice())
                    .totalPrice(orderItem.getPrice().multiply(BigDecimal.valueOf(orderItem.getQuantity())))
                    .build());
        }

        BigDecimal baseAmount = orderSubtotal;

        // Apply Discount Voucher
        BigDecimal discountAmount = BigDecimal.ZERO;
        if (discountCode != null && !discountCode.trim().isEmpty()) {
            Optional<DiscountEntity> discountOpt = discountRepository.findByCodeIgnoreCase(discountCode.trim());
            if (discountOpt.isPresent()) {
                DiscountEntity discount = discountOpt.get();
                LocalDate today = LocalDate.now();
                if (!today.isBefore(discount.getActiveFrom()) && !today.isAfter(discount.getActiveTo())) {
                    if ("PERCENTAGE".equalsIgnoreCase(discount.getDiscountType())) {
                        discountAmount = baseAmount.multiply(discount.getDiscountValue()).divide(BigDecimal.valueOf(100));
                    } else {
                        discountAmount = discount.getDiscountValue();
                    }
                }
            }
        }

        // Apply Loyalty Points Redemption ($0.10 per point)
        CustomerEntity customer = order.getCustomer();
        BigDecimal loyaltyDiscount = BigDecimal.ZERO;
        if (redeemPoints > 0 && customer != null) {
            if (customer.getLoyaltyPoints() < redeemPoints) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient loyalty points. Customer has only " + customer.getLoyaltyPoints());
            }
            loyaltyDiscount = BigDecimal.valueOf(redeemPoints).multiply(BigDecimal.valueOf(0.10)); // $0.10 per point
            discountAmount = discountAmount.add(loyaltyDiscount);

            // Deduct from customer
            customer.setLoyaltyPoints(customer.getLoyaltyPoints() - redeemPoints);
            customerRepository.save(customer);

            // Log loyalty deduction
            loyaltyPointRepository.save(LoyaltyPointEntity.builder()
                    .customer(customer)
                    .pointsEarned(0)
                    .pointsRedeemed(redeemPoints)
                    .notes("Redeemed points on order billing checkout")
                    .build());
        }

        BigDecimal netCharges = baseAmount.subtract(discountAmount);
        if (netCharges.compareTo(BigDecimal.ZERO) < 0) netCharges = BigDecimal.ZERO;

        // Apply Active Taxes
        BigDecimal taxAmount = BigDecimal.ZERO;
        List<TaxEntity> activeTaxes = taxRepository.findByActiveTrue();
        for (TaxEntity tax : activeTaxes) {
            BigDecimal taxValue = netCharges.multiply(tax.getPercentage()).divide(BigDecimal.valueOf(100));
            taxAmount = taxAmount.add(taxValue);
        }

        BigDecimal totalAmount = netCharges.add(taxAmount);

        InvoiceEntity invoice = InvoiceEntity.builder()
                .order(order)
                .invoiceNumber("INV-" + System.currentTimeMillis() / 1000)
                .orderSubtotal(orderSubtotal)
                .discountAmount(discountAmount)
                .taxAmount(taxAmount)
                .totalAmount(totalAmount)
                .paymentStatus("UNPAID")
                .build();

        final InvoiceEntity savedInvoice = invoiceRepository.save(invoice);

        // Link items
        for (InvoiceItemEntity item : items) {
            item.setInvoice(savedInvoice);
            invoiceItemRepository.save(item);
        }
        savedInvoice.setItems(new LinkedHashSet<>(items));

        return convertToDto(savedInvoice);
    }

    @Override
    @Transactional
    public void processPayment(PaymentDto dto) {
        InvoiceEntity invoice = invoiceRepository.findById(dto.getInvoiceId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found with ID: " + dto.getInvoiceId()));

        if ("PAID".equals(invoice.getPaymentStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invoice is already fully paid.");
        }

        PaymentMethodEntity method = paymentMethodRepository.findByNameIgnoreCase(dto.getPaymentMethodName())
                .orElseGet(() -> paymentMethodRepository.save(PaymentMethodEntity.builder()
                        .name(dto.getPaymentMethodName().toUpperCase())
                        .build()));

        PaymentEntity payment = PaymentEntity.builder()
                .invoice(invoice)
                .amount(dto.getAmount())
                .paymentMethod(method)
                .transactionReference(dto.getTransactionReference())
                .notes(dto.getNotes())
                .build();

        paymentRepository.save(payment);

        // Update payment status
        invoice.setPaymentStatus("PAID");
        invoiceRepository.save(invoice);

        // Handle Order completion if order is linked
        if (invoice.getOrder() != null) {
            orderService.updateOrderStatus(invoice.getOrder().getId(), "COMPLETED");

            // Inventory Stock Auto-Deductions on Order Settle
            for (OrderItemEntity orderItem : invoice.getOrder().getItems()) {
                String itemName = orderItem.getMenuItem().getName();
                Optional<InventoryItemEntity> invItemOpt = inventoryItemRepository.findByItemName(itemName);
                if (invItemOpt.isPresent()) {
                    InventoryItemEntity invItem = invItemOpt.get();
                    BigDecimal deductQty = BigDecimal.valueOf(orderItem.getQuantity());
                    if (invItem.getQuantity().compareTo(deductQty) >= 0) {
                        invItem.setQuantity(invItem.getQuantity().subtract(deductQty));
                        inventoryItemRepository.save(invItem);

                        stockTransactionRepository.save(StockTransactionEntity.builder()
                                .inventoryItem(invItem)
                                .transactionType("OUT")
                                .quantity(deductQty)
                                .reason("Auto-deduct on checkout settlement of Invoice " + invoice.getInvoiceNumber())
                                .transactionTime(Instant.now())
                                .build());
                    }
                }
            }

            // Reward Loyalty Points ($10 spent = 1 point)
            if (invoice.getOrder().getCustomer() != null) {
                CustomerEntity customer = invoice.getOrder().getCustomer();
                int pointsEarned = invoice.getTotalAmount().divide(BigDecimal.valueOf(10)).intValue();
                if (pointsEarned > 0) {
                    customer.setLoyaltyPoints(customer.getLoyaltyPoints() + pointsEarned);
                    customerRepository.save(customer);

                    loyaltyPointRepository.save(LoyaltyPointEntity.builder()
                            .customer(customer)
                            .pointsEarned(pointsEarned)
                            .pointsRedeemed(0)
                            .notes("Earned points on restaurant checkout payment: " + invoice.getInvoiceNumber())
                            .build());
                }
            }
        }

        // Handle Stay Check-Out completion if hotel reservation is linked
        if (invoice.getHotelReservation() != null) {
            HotelReservationEntity reservation = invoice.getHotelReservation();

            // Save checkout records if not already checked out
            if (checkOutRepository.findByReservationId(reservation.getId()).isEmpty()) {
                CheckOutEntity checkOut = CheckOutEntity.builder()
                        .reservation(reservation)
                        .checkOutTime(Instant.now())
                        .lateCheckoutFee(BigDecimal.ZERO)
                        .notes("Checked out automatically via invoice settlement")
                        .build();
                checkOutRepository.save(checkOut);
            }

            reservation.setStatus("CHECKED_OUT");
            hotelReservationRepository.save(reservation);

            RoomEntity room = reservation.getRoom();
            room.setStatus("CLEANING");
            roomRepository.save(room);

            // Complete unpaid orders linked to this room
            List<OrderEntity> unpaidOrders = orderRepository.findUnpaidOrdersByRoom(room.getId());
            for (OrderEntity o : unpaidOrders) {
                o.setStatus(statusRepository.findByName("COMPLETED")
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Status 'COMPLETED' not found.")));
                orderRepository.save(o);
            }

            // Reward Loyalty Points ($10 spent = 1 point)
            if (reservation.getCustomer() != null) {
                CustomerEntity customer = reservation.getCustomer();
                int pointsEarned = invoice.getTotalAmount().divide(BigDecimal.valueOf(10)).intValue();
                if (pointsEarned > 0) {
                    customer.setLoyaltyPoints(customer.getLoyaltyPoints() + pointsEarned);
                    customerRepository.save(customer);

                    loyaltyPointRepository.save(LoyaltyPointEntity.builder()
                            .customer(customer)
                            .pointsEarned(pointsEarned)
                            .pointsRedeemed(0)
                            .notes("Earned points on room stay checkout payment: " + invoice.getInvoiceNumber())
                            .build());
                }
            }
        }

        // Handle Table Reservation Check-Out completion if table reservation is linked
        if (invoice.getTableReservation() != null) {
            ReservationEntity reservation = invoice.getTableReservation();

            // Set table reservation status to Checked Out (ID: 4)
            ReservationStatusEntity status = tableStatusRepository.findByStatusNameIgnoreCase("Checked Out")
                    .orElseGet(() -> tableStatusRepository.save(ReservationStatusEntity.builder()
                            .statusName("Checked Out")
                            .description("Checked out")
                            .build()));
            reservation.setReservationStatus(status);
            tableReservationRepository.save(reservation);

            RestaurantTableEntity table = reservation.getTable();
            table.setStatus("AVAILABLE");
            tableRepository.save(table);

            // Complete unpaid orders linked to this table
            List<OrderEntity> unpaidOrders = orderRepository.findUnpaidOrdersByTable(table.getId());
            for (OrderEntity o : unpaidOrders) {
                o.setStatus(statusRepository.findByName("COMPLETED")
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Status 'COMPLETED' not found.")));
                orderRepository.save(o);
            }

            // Reward Loyalty Points ($10 spent = 1 point)
            if (reservation.getCustomer() != null) {
                CustomerEntity customer = reservation.getCustomer();
                int pointsEarned = invoice.getTotalAmount().divide(BigDecimal.valueOf(10)).intValue();
                if (pointsEarned > 0) {
                    customer.setLoyaltyPoints(customer.getLoyaltyPoints() + pointsEarned);
                    customerRepository.save(customer);

                    loyaltyPointRepository.save(LoyaltyPointEntity.builder()
                            .customer(customer)
                            .pointsEarned(pointsEarned)
                            .pointsRedeemed(0)
                            .notes("Earned points on table checkout payment: " + invoice.getInvoiceNumber())
                            .build());
                }
            }
        }
    }

    @Override
    @Transactional
    public InvoiceDto generateStayInvoice(Integer reservationId, String discountCode, int redeemPoints) {
        HotelReservationEntity reservation = hotelReservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reservation not found with ID: " + reservationId));

        if (invoiceRepository.findByHotelReservationId(reservationId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Invoice already generated for reservation: " + reservationId);
        }

        // Calculate nights stayed
        long nights = java.time.temporal.ChronoUnit.DAYS.between(reservation.getCheckInDate(), reservation.getCheckOutDate());
        if (nights <= 0) {
            nights = 1; // Minimum 1 night charge
        }

        BigDecimal roomPrice = reservation.getRoom().getRoomType().getDefaultPrice();
        BigDecimal roomCharges = roomPrice.multiply(BigDecimal.valueOf(nights));

        List<InvoiceItemEntity> items = new ArrayList<>();
        
        // Add Room Stay Charge Item
        items.add(InvoiceItemEntity.builder()
                .description("Room stay charges: Room " + reservation.getRoom().getRoomNumber() + " (" + nights + " nights @ Rs. " + roomPrice + ")")
                .quantity(1)
                .unitPrice(roomCharges)
                .totalPrice(roomCharges)
                .build());

        BigDecimal orderSubtotal = roomCharges;

        // Find unpaid restaurant orders for this room
        List<OrderEntity> unpaidOrders = orderRepository.findUnpaidOrdersByRoom(reservation.getRoom().getId());
        for (OrderEntity order : unpaidOrders) {
            for (OrderItemEntity orderItem : order.getItems()) {
                items.add(InvoiceItemEntity.builder()
                        .description("Order #" + order.getId() + ": " + orderItem.getMenuItem().getName())
                        .quantity(orderItem.getQuantity())
                        .unitPrice(orderItem.getPrice())
                        .totalPrice(orderItem.getPrice().multiply(BigDecimal.valueOf(orderItem.getQuantity())))
                        .build());
                orderSubtotal = orderSubtotal.add(orderItem.getPrice().multiply(BigDecimal.valueOf(orderItem.getQuantity())));
            }
        }

        BigDecimal baseAmount = orderSubtotal;

        // Apply Discount Voucher
        BigDecimal discountAmount = BigDecimal.ZERO;
        if (discountCode != null && !discountCode.trim().isEmpty()) {
            Optional<DiscountEntity> discountOpt = discountRepository.findByCodeIgnoreCase(discountCode.trim());
            if (discountOpt.isPresent()) {
                DiscountEntity discount = discountOpt.get();
                LocalDate today = LocalDate.now();
                if (!today.isBefore(discount.getActiveFrom()) && !today.isAfter(discount.getActiveTo())) {
                    if ("PERCENTAGE".equalsIgnoreCase(discount.getDiscountType())) {
                        discountAmount = baseAmount.multiply(discount.getDiscountValue()).divide(BigDecimal.valueOf(100));
                    } else {
                        discountAmount = discount.getDiscountValue();
                    }
                }
            }
        }

        // Apply Loyalty Points Redemption ($0.10 per point)
        CustomerEntity customer = reservation.getCustomer();
        BigDecimal loyaltyDiscount = BigDecimal.ZERO;
        if (redeemPoints > 0 && customer != null) {
            if (customer.getLoyaltyPoints() < redeemPoints) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient loyalty points. Customer has only " + customer.getLoyaltyPoints());
            }
            loyaltyDiscount = BigDecimal.valueOf(redeemPoints).multiply(BigDecimal.valueOf(0.10)); // $0.10 per point
            discountAmount = discountAmount.add(loyaltyDiscount);

            // Deduct from customer
            customer.setLoyaltyPoints(customer.getLoyaltyPoints() - redeemPoints);
            customerRepository.save(customer);

            // Log loyalty deduction
            loyaltyPointRepository.save(LoyaltyPointEntity.builder()
                    .customer(customer)
                    .pointsEarned(0)
                    .pointsRedeemed(redeemPoints)
                    .notes("Redeemed points on stay billing checkout")
                    .build());
        }

        BigDecimal netCharges = baseAmount.subtract(discountAmount);
        if (netCharges.compareTo(BigDecimal.ZERO) < 0) netCharges = BigDecimal.ZERO;

        // Apply Active Taxes
        BigDecimal taxAmount = BigDecimal.ZERO;
        List<TaxEntity> activeTaxes = taxRepository.findByActiveTrue();
        for (TaxEntity tax : activeTaxes) {
            BigDecimal taxValue = netCharges.multiply(tax.getPercentage()).divide(BigDecimal.valueOf(100));
            taxAmount = taxAmount.add(taxValue);
        }

        BigDecimal totalAmount = netCharges.add(taxAmount);

        InvoiceEntity invoice = InvoiceEntity.builder()
                .hotelReservation(reservation)
                .invoiceNumber("INV-STAY-" + System.currentTimeMillis() / 1000)
                .orderSubtotal(orderSubtotal)
                .discountAmount(discountAmount)
                .taxAmount(taxAmount)
                .totalAmount(totalAmount)
                .paymentStatus("UNPAID")
                .build();

        final InvoiceEntity savedInvoice = invoiceRepository.save(invoice);

        // Link items
        for (InvoiceItemEntity item : items) {
            item.setInvoice(savedInvoice);
            invoiceItemRepository.save(item);
        }
        savedInvoice.setItems(new LinkedHashSet<>(items));

        return convertToDto(savedInvoice);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceDto getInvoiceByReservationId(Integer reservationId) {
        InvoiceEntity invoice = invoiceRepository.findByHotelReservationId(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found for reservation ID: " + reservationId));
        return convertToDto(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceDto getInvoiceByOrderId(Integer orderId) {
        InvoiceEntity invoice = invoiceRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found for order ID: " + orderId));
        return convertToDto(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceDto getInvoiceById(Integer id) {
        InvoiceEntity invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found with ID: " + id));
        return convertToDto(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceDto> getAllInvoices() {
        return invoiceRepository.findAll().stream()
                .map(this::convertToDto)
                .toList();
    }

    private InvoiceDto convertToDto(InvoiceEntity invoice) {
        InvoiceDto dto = mapper.map(invoice, InvoiceDto.class);
        if (invoice.getOrder() != null) {
            dto.setOrderId(invoice.getOrder().getId());
        }
        if (invoice.getHotelReservation() != null) {
            dto.setReservationId(invoice.getHotelReservation().getId());
        }
        if (invoice.getTableReservation() != null) {
            dto.setTableReservationId(invoice.getTableReservation().getId());
        }

        List<InvoiceItemDto> itemDtos = invoice.getItems().stream()
                .map(item -> mapper.map(item, InvoiceItemDto.class))
                .toList();
        dto.setItems(itemDtos);

        return dto;
    }

    @Override
    @Transactional
    public InvoiceDto generateTableInvoice(Integer reservationId, String discountCode, int redeemPoints) {
        ReservationEntity reservation = tableReservationRepository.findById(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Table reservation not found with ID: " + reservationId));

        if (invoiceRepository.findByTableReservationId(reservationId).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Invoice already generated for table reservation: " + reservationId);
        }

        List<InvoiceItemEntity> items = new ArrayList<>();
        BigDecimal orderSubtotal = BigDecimal.ZERO;

        // Find unpaid restaurant orders for this table
        List<OrderEntity> unpaidOrders = orderRepository.findUnpaidOrdersByTable(reservation.getTable().getId());
        for (OrderEntity order : unpaidOrders) {
            for (OrderItemEntity orderItem : order.getItems()) {
                items.add(InvoiceItemEntity.builder()
                        .description("Order #" + order.getId() + ": " + orderItem.getMenuItem().getName())
                        .quantity(orderItem.getQuantity())
                        .unitPrice(orderItem.getPrice())
                        .totalPrice(orderItem.getPrice().multiply(BigDecimal.valueOf(orderItem.getQuantity())))
                        .build());
                orderSubtotal = orderSubtotal.add(orderItem.getPrice().multiply(BigDecimal.valueOf(orderItem.getQuantity())));
            }
        }

        BigDecimal baseAmount = orderSubtotal;

        // Apply Discount Voucher
        BigDecimal discountAmount = BigDecimal.ZERO;
        if (discountCode != null && !discountCode.trim().isEmpty()) {
            Optional<DiscountEntity> discountOpt = discountRepository.findByCodeIgnoreCase(discountCode.trim());
            if (discountOpt.isPresent()) {
                DiscountEntity discount = discountOpt.get();
                LocalDate today = LocalDate.now();
                if (!today.isBefore(discount.getActiveFrom()) && !today.isAfter(discount.getActiveTo())) {
                    if ("PERCENTAGE".equalsIgnoreCase(discount.getDiscountType())) {
                        discountAmount = baseAmount.multiply(discount.getDiscountValue()).divide(BigDecimal.valueOf(100));
                    } else {
                        discountAmount = discount.getDiscountValue();
                    }
                }
            }
        }

        // Apply Loyalty Points Redemption ($0.10 per point)
        CustomerEntity customer = reservation.getCustomer();
        BigDecimal loyaltyDiscount = BigDecimal.ZERO;
        if (redeemPoints > 0 && customer != null) {
            if (customer.getLoyaltyPoints() < redeemPoints) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Insufficient loyalty points. Customer has only " + customer.getLoyaltyPoints());
            }
            loyaltyDiscount = BigDecimal.valueOf(redeemPoints).multiply(BigDecimal.valueOf(0.10)); // $0.10 per point
            discountAmount = discountAmount.add(loyaltyDiscount);

            // Deduct from customer
            customer.setLoyaltyPoints(customer.getLoyaltyPoints() - redeemPoints);
            customerRepository.save(customer);

            // Log loyalty deduction
            loyaltyPointRepository.save(LoyaltyPointEntity.builder()
                    .customer(customer)
                    .pointsEarned(0)
                    .pointsRedeemed(redeemPoints)
                    .notes("Redeemed points on table billing checkout")
                    .build());
        }

        BigDecimal netCharges = baseAmount.subtract(discountAmount);
        if (netCharges.compareTo(BigDecimal.ZERO) < 0) netCharges = BigDecimal.ZERO;

        // Apply Active Taxes
        BigDecimal taxAmount = BigDecimal.ZERO;
        List<TaxEntity> activeTaxes = taxRepository.findByActiveTrue();
        for (TaxEntity tax : activeTaxes) {
            BigDecimal taxValue = netCharges.multiply(tax.getPercentage()).divide(BigDecimal.valueOf(100));
            taxAmount = taxAmount.add(taxValue);
        }

        BigDecimal totalAmount = netCharges.add(taxAmount);

        InvoiceEntity invoice = InvoiceEntity.builder()
                .tableReservation(reservation)
                .invoiceNumber("INV-TABLE-" + System.currentTimeMillis() / 1000)
                .orderSubtotal(orderSubtotal)
                .discountAmount(discountAmount)
                .taxAmount(taxAmount)
                .totalAmount(totalAmount)
                .paymentStatus("UNPAID")
                .build();

        final InvoiceEntity savedInvoice = invoiceRepository.save(invoice);

        // Link items
        for (InvoiceItemEntity item : items) {
            item.setInvoice(savedInvoice);
            invoiceItemRepository.save(item);
        }
        savedInvoice.setItems(new LinkedHashSet<>(items));

        return convertToDto(savedInvoice);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceDto getInvoiceByTableReservationId(Integer reservationId) {
        InvoiceEntity invoice = invoiceRepository.findByTableReservationId(reservationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found for table reservation ID: " + reservationId));
        return convertToDto(invoice);
    }
}
