package com.rms.polkole.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "menu_categories")
@SQLDelete(sql = "UPDATE menu_categories SET is_deleted = true WHERE id = ?")
@SQLRestriction("is_deleted = false")
public class MenuCategoryEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "name", nullable = false, unique = true, length = 100)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;
}
