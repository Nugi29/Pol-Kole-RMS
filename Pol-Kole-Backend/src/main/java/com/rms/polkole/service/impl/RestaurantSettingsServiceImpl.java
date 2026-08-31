package com.rms.polkole.service.impl;

import com.rms.polkole.dto.RestaurantSettingsDto;
import com.rms.polkole.entity.RestaurantSettingsEntity;
import com.rms.polkole.repository.RestaurantSettingsRepository;
import com.rms.polkole.service.RestaurantSettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class RestaurantSettingsServiceImpl implements RestaurantSettingsService {

    private final RestaurantSettingsRepository settingsRepository;
    private final ModelMapper modelMapper;

    public static final String DEVELOPER_KEY = "nugi1234";

    @Override
    @Transactional
    public RestaurantSettingsDto getSettings() {
        return modelMapper.map(getSettingsEntity(), RestaurantSettingsDto.class);
    }

    @Override
    @Transactional
    public RestaurantSettingsEntity getSettingsEntity() {
        return settingsRepository.findFirstByOrderByIdAsc()
                .orElseGet(this::initDefaultSettings);
    }

    @Override
    @Transactional
    public RestaurantSettingsDto updateSettings(RestaurantSettingsDto dto, String developerKey) {
        String keyToCheck = developerKey != null && !developerKey.isBlank() ? developerKey : dto.getDeveloperKey();
        if (keyToCheck == null || !DEVELOPER_KEY.equals(keyToCheck.trim())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid developer key. Developer authorization required to change restaurant settings.");
        }

        RestaurantSettingsEntity entity = getSettingsEntity();

        entity.setRestaurantFullName(dto.getRestaurantFullName() != null ? dto.getRestaurantFullName().trim() : entity.getRestaurantFullName());
        entity.setRestaurantShortName(dto.getRestaurantShortName() != null ? dto.getRestaurantShortName().trim() : entity.getRestaurantShortName());
        entity.setTagline(dto.getTagline());
        entity.setSlogan(dto.getSlogan());
        entity.setPhoneNumber(dto.getPhoneNumber());
        entity.setHotlinePhoneNumber(dto.getHotlinePhoneNumber());
        entity.setEmail(dto.getEmail());
        entity.setAddress(dto.getAddress());
        entity.setTaxNumber(dto.getTaxNumber());
        entity.setWebsite(dto.getWebsite());
        entity.setCurrency(dto.getCurrency() != null && !dto.getCurrency().isBlank() ? dto.getCurrency().trim() : "LKR");
        entity.setTaxPercentage(dto.getTaxPercentage() != null ? dto.getTaxPercentage() : BigDecimal.ZERO);
        entity.setServiceChargePercentage(dto.getServiceChargePercentage() != null ? dto.getServiceChargePercentage() : BigDecimal.valueOf(10));
        entity.setLogoUrl(dto.getLogoUrl());
        entity.setInvoiceFooter(dto.getInvoiceFooter());
        entity.setTermsConditions(dto.getTermsConditions());
        entity.setUpdatedAt(Instant.now());

        RestaurantSettingsEntity saved = settingsRepository.save(entity);
        log.info("Restaurant settings updated successfully by authorized developer");
        return modelMapper.map(saved, RestaurantSettingsDto.class);
    }

    private RestaurantSettingsEntity initDefaultSettings() {
        log.info("No restaurant settings found. Initializing default Pol-Kole configuration.");
        RestaurantSettingsEntity defaultSettings = RestaurantSettingsEntity.builder()
                .restaurantFullName("Pol-Kole")
                .restaurantShortName("Pol-Kole")
                .tagline("Dine • Stay • Enjoy")
                .slogan("Feels Like Home")
                .phoneNumber("+94 91 228 3456")
                .hotlinePhoneNumber("+94 77 123 4567")
                .email("info@polkole.lk")
                .address("Galle Road, Ahangama, Southern Province, Sri Lanka")
                .taxNumber("PV-98234-LK")
                .website("www.polkole.lk")
                .currency("LKR")
                .taxPercentage(BigDecimal.ZERO)
                .serviceChargePercentage(BigDecimal.valueOf(10.00))
                .logoUrl("")
                .invoiceFooter("Thank you for dining at Pol-Kole. See you again soon!")
                .termsConditions("All charges include 10% statutory hospitality service charge. Goods & Services are non-refundable once billed.")
                .updatedAt(Instant.now())
                .build();

        return settingsRepository.save(defaultSettings);
    }
}