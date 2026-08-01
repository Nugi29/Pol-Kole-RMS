package com.rms.polkole.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonAlias;

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

    @JsonProperty("isAvailable")
    @JsonAlias({"availability", "available"})
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    @Builder.Default
    private Boolean isAvailable = true;

    @NotNull(message = "Preparation time is required")
    @Min(value = 1, message = "Preparation time must be at least 1 minute")
    private Integer preparationTime;

    private String imageUrl;

    @JsonProperty("isAvailable")
    public boolean isAvailable() {
        return Boolean.TRUE.equals(this.isAvailable);
    }

    @JsonProperty("isAvailable")
    public void setAvailable(boolean available) {
        this.isAvailable = available;
    }
}
