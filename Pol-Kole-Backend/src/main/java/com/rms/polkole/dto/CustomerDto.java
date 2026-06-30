package com.rms.polkole.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerDto {
    private Integer id;

    @NotBlank(message = "Customer name is required")
    @Size(max = 100, message = "Name must not exceed 100 characters")
    private String name;

    @NotBlank(message = "NIC/Passport is required")
    @Size(max = 50, message = "NIC/Passport must not exceed 50 characters")
    private String nicPassport;

    @Email(message = "Invalid email format")
    @Size(max = 100, message = "Email must not exceed 100 characters")
    private String email;

    @NotBlank(message = "Phone number is required")
    @Size(max = 20, message = "Phone must not exceed 20 characters")
    private String phone;

    private String address;
    private String nationality;
    private Integer loyaltyPoints;
}
