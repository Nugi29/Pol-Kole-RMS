package com.rms.polkole.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RestaurantSettingsDto {

    private Integer id;

    @NotBlank(message = "Restaurant full name is required")
    private String restaurantFullName;

    @NotBlank(message = "Restaurant short name is required")
    private String restaurantShortName;

    private String tagline;

    private String slogan;

    private String phoneNumber;

    private String hotlinePhoneNumber;

    private String email;

    private String address;

    private String taxNumber;

    private String website;

    private String currency;

    @DecimalMin(value = "0.00", message = "Tax percentage must be at least 0")
    private BigDecimal taxPercentage;

    @DecimalMin(value = "0.00", message = "Service charge percentage must be at least 0")
    private BigDecimal serviceChargePercentage;

    private String logoUrl;

    private String invoiceFooter;

    private String termsConditions;

    private Instant updatedAt;

    // Optional key field when submitting update
    private String developerKey;
}