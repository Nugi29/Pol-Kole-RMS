package com.rms.polkole.service.impl;

import com.rms.polkole.repository.*;
import com.rms.polkole.service.CodeGeneratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class CodeGeneratorServiceImpl implements CodeGeneratorService {

    private final RoomRepository roomRepository;
    private final RestaurantTableRepository tableRepository;
    private final InvoiceRepository invoiceRepository;
    private final CustomerRepository customerRepository;
    private final TableLocationRepository tableLocationRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyMMdd");

    @Override
    public String generateNextRoomNumber(Integer floor) {
        if (floor == null) {
            floor = 1;
        }
        String prefix = floor.toString();
        String maxRoom = roomRepository.findMaxRoomNumberByPrefix(prefix + "%");
        if (maxRoom == null || maxRoom.trim().isEmpty()) {
            return prefix + "01";
        }
        try {
            String numericPart = maxRoom.replaceAll("\\D+", "");
            if (numericPart.startsWith(prefix)) {
                int nextVal = Integer.parseInt(numericPart) + 1;
                return String.valueOf(nextVal);
            }
        } catch (NumberFormatException e) {
            // fallback
        }
        return prefix + "01";
    }

    @Override
    public String generateNextTableNumber(String locationParam) {
        String locationCode = "LOC";
        if (locationParam != null && !locationParam.trim().isEmpty()) {
            com.rms.polkole.entity.TableLocationEntity location = null;
            try {
                Integer id = Integer.parseInt(locationParam);
                location = tableLocationRepository.findById(id).orElse(null);
            } catch (NumberFormatException e) {
                // Ignore
            }
            if (location == null) {
                location = tableLocationRepository.findByName(locationParam).orElse(null);
            }
            if (location == null) {
                location = tableLocationRepository.findByCode(locationParam).orElse(null);
            }
            if (location != null) {
                locationCode = location.getCode();
            } else {
                locationCode = getShortLocation(locationParam).toUpperCase();
            }
        }
        
        String prefix = "T-" + locationCode + "-";
        String maxTable = tableRepository.findMaxTableNumberByPrefixIncludingDeleted(prefix + "%");
        if (maxTable == null || maxTable.trim().isEmpty()) {
            return prefix + "01";
        }
        try {
            String suffix = maxTable.substring(prefix.length());
            int nextVal = Integer.parseInt(suffix) + 1;
            return prefix + String.format("%02d", nextVal);
        } catch (Exception e) {
            return prefix + "01";
        }
    }

    @Override
    public String generateNextInvoiceNumber(String type) {
        String dateStr = LocalDate.now().format(DATE_FORMATTER); // e.g. "260815"
        
        if ("ROOM".equalsIgnoreCase(type)) {
            String prefix = "INV-ROOM-" + dateStr;
            String maxInv = invoiceRepository.findMaxInvoiceNumberByPrefix(prefix + "%");
            if (maxInv == null || maxInv.trim().isEmpty()) {
                return prefix + "01";
            }
            try {
                String suffix = maxInv.substring(prefix.length());
                int nextVal = Integer.parseInt(suffix) + 1;
                return prefix + String.format("%02d", nextVal);
            } catch (Exception e) {
                return prefix + "01";
            }
        } else if ("TABLE".equalsIgnoreCase(type)) {
            String prefix = "INV-TABLE-" + dateStr;
            String maxInv = invoiceRepository.findMaxInvoiceNumberByPrefix(prefix + "%");
            if (maxInv == null || maxInv.trim().isEmpty()) {
                return prefix + "001";
            }
            try {
                String suffix = maxInv.substring(prefix.length());
                int nextVal = Integer.parseInt(suffix) + 1;
                return prefix + String.format("%03d", nextVal);
            } catch (Exception e) {
                return prefix + "001";
            }
        } else {
            String prefix = "INV-" + dateStr;
            String maxInv = invoiceRepository.findMaxInvoiceNumberByPrefix(prefix + "%");
            
            if (maxInv != null && (maxInv.contains("ROOM") || maxInv.contains("TABLE"))) {
                maxInv = null;
            }
            
            if (maxInv == null || maxInv.trim().isEmpty()) {
                return prefix + "0001";
            }
            try {
                String suffix = maxInv.substring(prefix.length());
                suffix = suffix.replaceAll("\\D+", "");
                if (suffix.isEmpty()) {
                    return prefix + "0001";
                }
                int nextVal = Integer.parseInt(suffix) + 1;
                return prefix + String.format("%04d", nextVal);
            } catch (Exception e) {
                return prefix + "0001";
            }
        }
    }

    @Override
    public String generateNextCustomerCode() {
        Integer maxId = customerRepository.findMaxId();
        int nextId = (maxId == null) ? 1 : maxId + 1;
        return "CUST-" + String.format("%05d", nextId);
    }

    private String getShortLocation(String location) {
        if (location == null) return "Loc";
        String lower = location.toLowerCase();
        if (lower.contains("main")) return "Main";
        if (lower.contains("outdoor") || lower.contains("out")) return "Out";
        if (lower.contains("rooftop") || lower.contains("roof")) return "Roof";
        if (lower.contains("vip")) return "VIP";
        if (lower.contains("garden") || lower.contains("pool")) return "Pool";
        return "Loc";
    }
}