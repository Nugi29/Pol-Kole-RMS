package com.rms.polkole.controller;

import com.rms.polkole.dto.PresenceStatusDto;
import com.rms.polkole.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/presence")
@RequiredArgsConstructor
@CrossOrigin
public class PresenceController {

    private final PresenceService presenceService;

    @PutMapping("/{userId}")
    public ResponseEntity<PresenceStatusDto> updatePresence(
            @PathVariable Integer userId,
            @RequestParam String status) {
        return ResponseEntity.ok(presenceService.updatePresence(userId, status));
    }

    @PostMapping("/heartbeat/{userId}")
    public ResponseEntity<PresenceStatusDto> heartbeat(@PathVariable Integer userId) {
        return ResponseEntity.ok(presenceService.heartbeat(userId));
    }

    @GetMapping("/all")
    public ResponseEntity<List<PresenceStatusDto>> getAllPresences() {
        return ResponseEntity.ok(presenceService.getAllPresenceStatuses());
    }

    @GetMapping("/{userId}")
    public ResponseEntity<PresenceStatusDto> getUserPresence(@PathVariable Integer userId) {
        return ResponseEntity.ok(presenceService.getUserPresence(userId));
    }
}
