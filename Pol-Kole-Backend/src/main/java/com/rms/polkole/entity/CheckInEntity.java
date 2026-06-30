package com.rms.polkole.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "checkins")
@EntityListeners(AuditingEntityListener.class)
public class CheckInEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @OneToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "reservation_id", nullable = false, unique = true)
    private HotelReservationEntity reservation;

    @Column(name = "check_in_time", nullable = false)
    private Instant checkInTime;

    @Column(name = "actual_guests_count", nullable = false)
    private Integer actualGuestsCount;

    @Column(name = "notes", length = 500)
    private String notes;

    @CreatedBy
    @Column(name = "created_by", updatable = false, length = 50)
    private String createdBy;

    @PrePersist
    protected void onCreate() {
        if (checkInTime == null) {
            checkInTime = Instant.now();
        }
    }
}
