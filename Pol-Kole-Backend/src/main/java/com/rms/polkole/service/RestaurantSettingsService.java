package com.rms.polkole.service;

import com.rms.polkole.dto.RestaurantSettingsDto;
import com.rms.polkole.entity.RestaurantSettingsEntity;

public interface RestaurantSettingsService {
    RestaurantSettingsDto getSettings();
    RestaurantSettingsDto updateSettings(RestaurantSettingsDto dto, String developerKey);
    RestaurantSettingsEntity getSettingsEntity();
}