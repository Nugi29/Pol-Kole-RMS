package com.rms.polkole.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "checkouts")
@EntityListeners(AuditingEntityListener.class)
public class CheckOutEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @OneToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "reservation_id", nullable = false, unique = true)
    private HotelReservationEntity reservation;

    @Column(name = "check_out_time", nullable = false)
    private Instant checkOutTime;

    @Column(name = "late_checkout_fee", precision = 10, scale = 2)
    private BigDecimal lateCheckoutFee = BigDecimal.ZERO;

    @Column(name = "notes", length = 500)
    private String notes;

    @CreatedBy
    @Column(name = "created_by", updatable = false, length = 50)
    private String createdBy;

    @PrePersist
    protected void onCreate() {
        if (checkOutTime == null) {
            checkOutTime = Instant.now();
        }
        if (lateCheckoutFee == null) {
            lateCheckoutFee = BigDecimal.ZERO;
        }
    }
}
