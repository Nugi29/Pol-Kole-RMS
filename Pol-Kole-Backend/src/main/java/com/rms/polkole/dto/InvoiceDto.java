package com.rms.polkole.dto;

import lombok.*;
import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvoiceDto {
    private Integer id;
    private Integer orderId;
    private Integer reservationId;
    private Integer tableReservationId;
    private String invoiceNumber;
    private BigDecimal orderSubtotal;
    private BigDecimal taxAmount;
    private BigDecimal discountAmount;
    private BigDecimal totalAmount;
    private String paymentStatus; // UNPAID, PAID
    private List<InvoiceItemDto> items;
}
