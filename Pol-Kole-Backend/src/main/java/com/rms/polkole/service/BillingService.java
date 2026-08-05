package com.rms.polkole.service;

import com.rms.polkole.dto.InvoiceDto;
import com.rms.polkole.dto.PaymentDto;
import java.util.List;

public interface BillingService {
    InvoiceDto generateInvoice(Integer orderId, String discountCode, int redeemPoints);
    void processPayment(PaymentDto paymentDto);
    InvoiceDto getInvoiceByOrderId(Integer orderId);
    InvoiceDto getInvoiceById(Integer id);
    List<InvoiceDto> getAllInvoices();
    InvoiceDto generateStayInvoice(Integer reservationId, String discountCode, int redeemPoints);
    InvoiceDto getInvoiceByReservationId(Integer reservationId);
    InvoiceDto generateTableInvoice(Integer reservationId, String discountCode, int redeemPoints);
    InvoiceDto getInvoiceByTableReservationId(Integer reservationId);
}
