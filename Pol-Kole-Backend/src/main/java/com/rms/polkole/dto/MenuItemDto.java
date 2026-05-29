package com.rms.polkole.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MenuItemDto {
    private Integer id;

    @NotBlank(message = "Item name is required")
    @Size(max = 150, message = "Item name must not exceed 150 characters")
    private String name;

    private String description;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.01", message = "Price must be positive")
    private BigDecimal price;

    @NotNull(message = "Category is required")
    private Integer categoryId;

    private String categoryName;

    private boolean isAvailable = true;

    @NotNull(message = "Preparation time is required")
    @Min(value = 1, message = "Preparation time must be at least 1 minute")
    private Integer preparationTime;

    private String imageUrl;
}
