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
@Table(name = "loyalty_points")
public class LoyaltyPointEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private CustomerEntity customer;

    @Column(name = "points_earned", nullable = false)
    private Integer pointsEarned = 0;

    @Column(name = "points_redeemed", nullable = false)
    private Integer pointsRedeemed = 0;

    @Column(name = "transaction_date", nullable = false)
    private Instant transactionDate;

    @Column(name = "notes", length = 255)
    private String notes;

    @PrePersist
    protected void onCreate() {
        transactionDate = Instant.now();
    }
}
