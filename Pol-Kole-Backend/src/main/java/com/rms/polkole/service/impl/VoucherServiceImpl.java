package com.rms.polkole.service.impl;

import com.rms.polkole.dto.VoucherDto;
import com.rms.polkole.entity.VoucherEntity;
import com.rms.polkole.repository.VoucherRepository;
import com.rms.polkole.service.VoucherService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VoucherServiceImpl implements VoucherService {

    private final VoucherRepository voucherRepository;

    @Override
    @Transactional
    public VoucherDto createVoucher(VoucherDto dto) {
        String cleanCode = dto.getCode().trim().toUpperCase();
        if (voucherRepository.existsByCodeIgnoreCase(cleanCode)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Voucher code already exists: " + cleanCode);
        }

        if (dto.getActiveTo().isBefore(dto.getActiveFrom())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expiry date cannot be before active from date");
        }

        VoucherEntity entity = VoucherEntity.builder()
                .code(cleanCode)
                .description(dto.getDescription())
                .discountType(dto.getDiscountType().toUpperCase())
                .discountValue(dto.getDiscountValue())
                .minBillAmount(dto.getMinBillAmount())
                .maxDiscountAmount(dto.getMaxDiscountAmount())
                .activeFrom(dto.getActiveFrom())
                .activeTo(dto.getActiveTo())
                .usageLimit(dto.getUsageLimit())
                .usageCount(0)
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .applicableType(dto.getApplicableType() != null && !dto.getApplicableType().isBlank() ? dto.getApplicableType().toUpperCase() : "ALL")
                .build();

        entity = voucherRepository.save(entity);
        return mapToDto(entity);
    }

    @Override
    @Transactional
    public VoucherDto updateVoucher(Integer id, VoucherDto dto) {
        VoucherEntity entity = voucherRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Voucher not found with ID: " + id));

        String cleanCode = dto.getCode().trim().toUpperCase();
        voucherRepository.findByCodeIgnoreCase(cleanCode)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Voucher code already registered: " + cleanCode);
                });

        if (dto.getActiveTo().isBefore(dto.getActiveFrom())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expiry date cannot be before active from date");
        }

        entity.setCode(cleanCode);
        entity.setDescription(dto.getDescription());
        entity.setDiscountType(dto.getDiscountType().toUpperCase());
        entity.setDiscountValue(dto.getDiscountValue());
        entity.setMinBillAmount(dto.getMinBillAmount());
        entity.setMaxDiscountAmount(dto.getMaxDiscountAmount());
        entity.setActiveFrom(dto.getActiveFrom());
        entity.setActiveTo(dto.getActiveTo());
        entity.setUsageLimit(dto.getUsageLimit());
        if (dto.getIsActive() != null) {
            entity.setActive(dto.getIsActive());
        }
        if (dto.getApplicableType() != null && !dto.getApplicableType().isBlank()) {
            entity.setApplicableType(dto.getApplicableType().toUpperCase());
        }

        entity = voucherRepository.save(entity);
        return mapToDto(entity);
    }

    @Override
    @Transactional
    public void deleteVoucher(Integer id) {
        VoucherEntity entity = voucherRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Voucher not found with ID: " + id));
        voucherRepository.delete(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public VoucherDto getVoucherById(Integer id) {
        VoucherEntity entity = voucherRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Voucher not found with ID: " + id));
        return mapToDto(entity);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<VoucherDto> searchVouchers(String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        Page<VoucherEntity> vouchers = voucherRepository.searchVouchers(search, pageable);
        return vouchers.map(this::mapToDto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<VoucherDto> getActiveValidVouchers() {
        LocalDate today = LocalDate.now();
        List<VoucherEntity> activeList = voucherRepository.findActiveValidVouchers(today);
        return activeList.stream()
                .filter(v -> v.getUsageLimit() == null || v.getUsageCount() < v.getUsageLimit())
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public VoucherDto validateVoucher(String code, BigDecimal billAmount, String orderType) {
        if (code == null || code.trim().isEmpty()) {
            return VoucherDto.builder().valid(false).validationMessage("Voucher code cannot be empty").build();
        }

        VoucherEntity voucher = voucherRepository.findByCodeIgnoreCase(code.trim()).orElse(null);
        if (voucher == null) {
            return VoucherDto.builder().valid(false).validationMessage("Invalid voucher code: " + code).build();
        }

        LocalDate today = LocalDate.now();
        if (!voucher.isActive()) {
            return VoucherDto.builder().code(voucher.getCode()).valid(false).validationMessage("This voucher is currently inactive / paused").build();
        }

        if (today.isBefore(voucher.getActiveFrom())) {
            return VoucherDto.builder().code(voucher.getCode()).valid(false).validationMessage("Voucher is not yet active (Starts on " + voucher.getActiveFrom() + ")").build();
        }

        if (today.isAfter(voucher.getActiveTo())) {
            return VoucherDto.builder().code(voucher.getCode()).valid(false).validationMessage("Voucher has expired on " + voucher.getActiveTo()).build();
        }

        if (voucher.getUsageLimit() != null && voucher.getUsageCount() >= voucher.getUsageLimit()) {
            return VoucherDto.builder().code(voucher.getCode()).valid(false).validationMessage("Voucher maximum usage limit (" + voucher.getUsageLimit() + ") has been reached").build();
        }

        if (voucher.getApplicableType() != null && !"ALL".equalsIgnoreCase(voucher.getApplicableType())) {
            if (orderType != null && !voucher.getApplicableType().equalsIgnoreCase(orderType)) {
                return VoucherDto.builder().code(voucher.getCode()).valid(false).validationMessage("Voucher is only applicable for " + voucher.getApplicableType() + " invoices").build();
            }
        }

        BigDecimal safeBill = billAmount != null ? billAmount : BigDecimal.ZERO;
        if (voucher.getMinBillAmount() != null && safeBill.compareTo(voucher.getMinBillAmount()) < 0) {
            return VoucherDto.builder().code(voucher.getCode()).valid(false)
                    .validationMessage("Requires minimum bill subtotal of Rs. " + voucher.getMinBillAmount() + " (Current: Rs. " + safeBill + ")").build();
        }

        BigDecimal discountAmount = calculateDiscount(voucher, safeBill);

        VoucherDto dto = mapToDto(voucher);
        dto.setValid(true);
        dto.setPreviewDiscountAmount(discountAmount);
        dto.setValidationMessage(voucher.getCode() + " applied! " + ( "PERCENTAGE".equalsIgnoreCase(voucher.getDiscountType()) ? voucher.getDiscountValue() + "% off" : "Rs. " + voucher.getDiscountValue() + " off" ) + " (-Rs. " + discountAmount + ")");
        return dto;
    }

    @Override
    @Transactional
    public VoucherDto toggleActiveStatus(Integer id) {
        VoucherEntity entity = voucherRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Voucher not found with ID: " + id));
        entity.setActive(!entity.isActive());
        entity = voucherRepository.save(entity);
        return mapToDto(entity);
    }

    @Override
    @Transactional
    public BigDecimal calculateAndApplyVoucher(String code, BigDecimal billAmount, String orderType) {
        if (code == null || code.trim().isEmpty()) {
            return BigDecimal.ZERO;
        }

        VoucherEntity voucher = voucherRepository.findByCodeIgnoreCase(code.trim()).orElse(null);
        if (voucher == null) {
            return BigDecimal.ZERO;
        }

        LocalDate today = LocalDate.now();
        if (!voucher.isActive() || today.isBefore(voucher.getActiveFrom()) || today.isAfter(voucher.getActiveTo())) {
            return BigDecimal.ZERO;
        }

        if (voucher.getUsageLimit() != null && voucher.getUsageCount() >= voucher.getUsageLimit()) {
            return BigDecimal.ZERO;
        }

        if (voucher.getApplicableType() != null && !"ALL".equalsIgnoreCase(voucher.getApplicableType())) {
            if (orderType != null && !voucher.getApplicableType().equalsIgnoreCase(orderType)) {
                return BigDecimal.ZERO;
            }
        }

        BigDecimal safeBill = billAmount != null ? billAmount : BigDecimal.ZERO;
        if (voucher.getMinBillAmount() != null && safeBill.compareTo(voucher.getMinBillAmount()) < 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal discountAmount = calculateDiscount(voucher, safeBill);

        // Increment usage count and save
        voucher.setUsageCount(voucher.getUsageCount() + 1);
        voucherRepository.save(voucher);

        return discountAmount;
    }

    private BigDecimal calculateDiscount(VoucherEntity voucher, BigDecimal billAmount) {
        BigDecimal discount = BigDecimal.ZERO;
        if ("PERCENTAGE".equalsIgnoreCase(voucher.getDiscountType())) {
            discount = billAmount.multiply(voucher.getDiscountValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            if (voucher.getMaxDiscountAmount() != null && discount.compareTo(voucher.getMaxDiscountAmount()) > 0) {
                discount = voucher.getMaxDiscountAmount();
            }
        } else {
            discount = voucher.getDiscountValue();
            if (discount.compareTo(billAmount) > 0) {
                discount = billAmount;
            }
        }
        return discount;
    }

    private VoucherDto mapToDto(VoucherEntity entity) {
        LocalDate today = LocalDate.now();
        String status = "ACTIVE";
        if (!entity.isActive()) {
            status = "PAUSED";
        } else if (today.isAfter(entity.getActiveTo())) {
            status = "EXPIRED";
        } else if (entity.getUsageLimit() != null && entity.getUsageCount() >= entity.getUsageLimit()) {
            status = "EXHAUSTED";
        }

        return VoucherDto.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .description(entity.getDescription())
                .discountType(entity.getDiscountType())
                .discountValue(entity.getDiscountValue())
                .minBillAmount(entity.getMinBillAmount())
                .maxDiscountAmount(entity.getMaxDiscountAmount())
                .activeFrom(entity.getActiveFrom())
                .activeTo(entity.getActiveTo())
                .usageLimit(entity.getUsageLimit())
                .usageCount(entity.getUsageCount())
                .isActive(entity.isActive())
                .applicableType(entity.getApplicableType())
                .status(status)
                .build();
    }
}
