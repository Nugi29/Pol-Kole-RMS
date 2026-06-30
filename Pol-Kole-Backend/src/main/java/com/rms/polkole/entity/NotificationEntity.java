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
@Table(name = "notifications")
public class NotificationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "recipient", nullable = false, length = 100)
    private String recipient;

    @Column(name = "subject", nullable = false, length = 150)
    private String subject;

    @Lob
    @Column(name = "content", nullable = false)
    private String content;

    @Column(name = "type", nullable = false, length = 10)
    private String type; // EMAIL, SMS

    @Column(name = "status", nullable = false, length = 20)
    private String status; // PENDING, SENT, FAILED

    @Column(name = "sent_at")
    private Instant sentAt;

    @PrePersist
    protected void onCreate() {
        if (sentAt == null && "SENT".equals(status)) {
            sentAt = Instant.now();
        }
    }
}
