package com.rms.polkole.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "kitchen_orders")
public class KitchenOrderEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "order_id", nullable = false)
    private OrderEntity order;

    @Column(name = "preparation_status", nullable = false, length = 50)
    private String preparationStatus; // RECEIVED, PREPARING, READY, DELIVERED

    @Column(name = "preparation_timer")
    private Integer preparationTimer; // Duration estimate in minutes

    @Column(name = "start_time")
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    @PrePersist
    protected void onCreate() {
        if (startTime == null) {
            startTime = Instant.now();
        }
        if (preparationStatus == null) {
            preparationStatus = "RECEIVED";
        }
    }
}
