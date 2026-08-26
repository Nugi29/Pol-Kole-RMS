package com.rms.polkole.dto;

import lombok.*;
import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PresenceStatusDto {
    private Integer userId;
    private String name;
    private String role;
    private String onlineStatus; // ONLINE, OFFLINE
    private Instant lastSeen;
}
