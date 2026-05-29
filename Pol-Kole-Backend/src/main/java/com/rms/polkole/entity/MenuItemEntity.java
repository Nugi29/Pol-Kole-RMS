package com.rms.polkole.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "menu_items")
@SQLDelete(sql = "UPDATE menu_items SET is_deleted = true WHERE id = ?")
@SQLRestriction("is_deleted = false")
public class MenuItemEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "category_id", nullable = false)
    private MenuCategoryEntity category;

    @Column(name = "is_available", nullable = false)
    private boolean isAvailable = true;

    @Column(name = "preparation_time", nullable = false)
    private Integer preparationTime; // In minutes

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;
}
