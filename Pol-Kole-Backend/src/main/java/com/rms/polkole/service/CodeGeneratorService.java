package com.rms.polkole.service;

public interface CodeGeneratorService {
    String generateNextRoomNumber(Integer floor);
    String generateNextTableNumber(String location);
    String generateNextInvoiceNumber(String type); // type can be "ROOM", "TABLE", "TAKEAWAY"
    String generateNextCustomerCode();
}
