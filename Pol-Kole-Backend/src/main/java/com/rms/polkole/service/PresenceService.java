package com.rms.polkole.service;

import com.rms.polkole.dto.PresenceStatusDto;
import java.util.List;

public interface PresenceService {
    PresenceStatusDto updatePresence(Integer userId, String status);
    PresenceStatusDto heartbeat(Integer userId);
    List<PresenceStatusDto> getAllPresenceStatuses();
    PresenceStatusDto getUserPresence(Integer userId);
}
