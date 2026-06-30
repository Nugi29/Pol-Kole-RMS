package com.rms.polkole.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "room_types")
public class RoomTypeEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "max_capacity", nullable = false)
    private Integer maxCapacity;

    @Column(name = "default_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal defaultPrice;

    @Column(name = "amenities", length = 500)
    private String amenities;

    @OneToMany(mappedBy = "roomType")
    @Builder.Default
    private Set<RoomEntity> rooms = new LinkedHashSet<>();
}
