package com.rms.polkole.controller;

import com.rms.polkole.dto.RestaurantSettingsDto;
import com.rms.polkole.service.RestaurantSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@CrossOrigin()
public class RestaurantSettingsController {

    private final RestaurantSettingsService settingsService;

    @GetMapping
    public ResponseEntity<RestaurantSettingsDto> getSettings() {
        return ResponseEntity.ok(settingsService.getSettings());
    }

    @PutMapping
    public ResponseEntity<RestaurantSettingsDto> updateSettings(
            @RequestHeader(value = "X-Developer-Key", required = false) String developerKey,
            @Valid @RequestBody RestaurantSettingsDto dto) {
        return ResponseEntity.ok(settingsService.updateSettings(dto, developerKey));
    }
}