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

        // Update Order status to COMPLETED
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
        dto.setOrderId(invoice.getOrder().getId());

        List<InvoiceItemDto> itemDtos = invoice.getItems().stream()
                .map(item -> mapper.map(item, InvoiceItemDto.class))
                .toList();
        dto.setItems(itemDtos);

        return dto;
    }
}
