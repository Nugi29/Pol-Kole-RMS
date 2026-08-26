package com.rms.polkole.dto;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CallWaiterRequestDto {
    private String locationType; // TABLE, ROOM
    private Integer locationId;
    private String locationNumber; // e.g. T-02, 101
    private String callType; // WAITER, BILL, WATER, CUTLERY, CLEANING, RECEPTION, etc.
    private String message;
}
