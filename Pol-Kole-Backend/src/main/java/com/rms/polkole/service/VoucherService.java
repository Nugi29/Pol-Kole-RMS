package com.rms.polkole.service;

import com.rms.polkole.dto.VoucherDto;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.util.List;

public interface VoucherService {
    VoucherDto createVoucher(VoucherDto dto);
    VoucherDto updateVoucher(Integer id, VoucherDto dto);
    void deleteVoucher(Integer id);
    VoucherDto getVoucherById(Integer id);
    Page<VoucherDto> searchVouchers(String search, int page, int size);
    List<VoucherDto> getActiveValidVouchers();
    VoucherDto validateVoucher(String code, BigDecimal billAmount, String orderType);
    VoucherDto toggleActiveStatus(Integer id);
    BigDecimal calculateAndApplyVoucher(String code, BigDecimal billAmount, String orderType);
}
