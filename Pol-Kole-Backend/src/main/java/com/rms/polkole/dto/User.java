package com.rms.polkole.dto;


import lombok.*;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class User {
    private String name;
    private String email;
    private String phone;
    private String password;
    private String role;
    private String status;
}

