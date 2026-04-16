package com.rms.polkole.dto;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FullUser {
    private Integer id;
    private String name;
    private String email;
    private String phone;
    private Instant createdOn;
    private Instant updatedOn;
    private Lookup status;
    private Lookup role;
}
