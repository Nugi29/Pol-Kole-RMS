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
@Table(name = "restaurant_tables")
@SQLDelete(sql = "UPDATE restaurant_tables SET is_deleted = true WHERE id = ?")
@SQLRestriction("is_deleted = false")
public class RestaurantTableEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "table_number", nullable = false, unique = true, length = 20)
    private String tableNumber;

    @Column(name = "capacity", nullable = false)
    private Integer capacity;

    @Column(name = "status", nullable = false, length = 30)
    private String status; // AVAILABLE, RESERVED, OCCUPIED, CLEANING

    @Column(name = "location", length = 100)
    private String location; // e.g. Main Hall, Terrace, Balcony

    @Column(name = "is_available_for_reservation", nullable = false)
    private boolean isAvailableForReservation = true;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;
}
