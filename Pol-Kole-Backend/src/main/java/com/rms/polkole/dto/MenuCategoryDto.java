package com.rms.polkole.dto;

import jakarta.validation.constraints.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MenuCategoryDto {
    private Integer id;

    @NotBlank(message = "Category name is required")
    @Size(max = 100, message = "Name must not exceed 100 characters")
    private String name;

    private String description;
}
