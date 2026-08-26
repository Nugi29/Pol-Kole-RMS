package com.rms.polkole.service.impl;

import com.rms.polkole.dto.PresenceStatusDto;
import com.rms.polkole.entity.UserEntity;
import com.rms.polkole.repository.UserRepository;
import com.rms.polkole.service.PresenceService;
import com.rms.polkole.service.StaffNotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PresenceServiceImpl implements PresenceService {

    private final UserRepository userRepository;
    private final StaffNotificationService notificationService;

    @Override
    @Transactional
    public PresenceStatusDto updatePresence(Integer userId, String status) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with ID: " + userId));

        String normalizedStatus = "ONLINE".equalsIgnoreCase(status) ? "ONLINE" : "OFFLINE";
        user.setOnlineStatus(normalizedStatus);
        user.setLastSeen(Instant.now());
        user = userRepository.save(user);

        PresenceStatusDto dto = mapToDto(user);
        notificationService.broadcastToTopic("/topic/presence", dto);
        return dto;
    }

    @Override
    @Transactional
    public PresenceStatusDto heartbeat(Integer userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with ID: " + userId));

        user.setOnlineStatus("ONLINE");
        user.setLastSeen(Instant.now());
        user = userRepository.save(user);
        return mapToDto(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PresenceStatusDto> getAllPresenceStatuses() {
        return userRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PresenceStatusDto getUserPresence(Integer userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with ID: " + userId));
        return mapToDto(user);
    }

    private PresenceStatusDto mapToDto(UserEntity user) {
        return PresenceStatusDto.builder()
                .userId(user.getId())
                .name(user.getName())
                .role(user.getRole() != null ? user.getRole().getName() : "Staff")
                .onlineStatus(user.getOnlineStatus() != null ? user.getOnlineStatus() : "OFFLINE")
                .lastSeen(user.getLastSeen())
                .build();
    }
}
