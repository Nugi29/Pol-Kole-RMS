package com.rms.polkole.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoucherDto {
    private Integer id;

    @NotBlank(message = "Voucher code cannot be blank")
    @Size(max = 30, message = "Voucher code cannot exceed 30 characters")
    private String code;

    @Size(max = 255, message = "Description cannot exceed 255 characters")
    private String description;

    @NotBlank(message = "Discount type is required (PERCENTAGE or FIXED)")
    private String discountType;

    @NotNull(message = "Discount value is required")
    @DecimalMin(value = "0.01", message = "Discount value must be greater than zero")
    private BigDecimal discountValue;

    private BigDecimal minBillAmount;
    private BigDecimal maxDiscountAmount;

    @NotNull(message = "Active from date is required")
    private LocalDate activeFrom;

    @NotNull(message = "Active to date is required")
    private LocalDate activeTo;

    private Integer usageLimit;
    private int usageCount;
    private Boolean isActive;
    private String applicableType;

    private String status;
    private BigDecimal previewDiscountAmount;
    private boolean valid;
    private String validationMessage;
}
