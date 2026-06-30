package com.rms.polkole.service;

public interface JasperReportService {
    byte[] generateInvoicePdf(Integer invoiceId);
}
