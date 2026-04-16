package com.rms.polkole.dto;

import lombok.*;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LoginResponse {
    private String token;
    private Integer userId;
    private String name;
    private String email;
    private String role;
}
