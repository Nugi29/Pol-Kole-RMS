package com.rms.polkole.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentDto {
    @NotNull(message = "Invoice ID is required")
    private Integer invoiceId;

    @NotNull(message = "Payment amount is required")
    @Positive(message = "Payment must be a positive amount")
    private BigDecimal amount;

    @NotBlank(message = "Payment method name is required")
    private String paymentMethodName; // CASH, CARD, ONLINE

    private String transactionReference;
    private String notes;
}
