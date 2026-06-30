package com.rms.polkole.entity;

import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "rooms")
public class RoomEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "room_number", nullable = false, unique = true, length = 20)
    private String roomNumber;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomTypeEntity roomType;

    @Column(name = "status", nullable = false, length = 20)
    private String status; // AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE

    @Column(name = "capacity", nullable = false)
    private Integer capacity;

    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private boolean isDeleted = false;
}
