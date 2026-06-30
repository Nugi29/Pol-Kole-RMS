package com.rms.polkole.dto;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoomDto {
    private Integer id;
    private String roomNumber;
    private Integer roomTypeId;
    private String roomTypeName;
    private String status; // AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE
    private Integer capacity;
}
