package com.rms.polkole.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "restaurant_settings")
@EntityListeners(AuditingEntityListener.class)
public class RestaurantSettingsEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "restaurant_full_name", nullable = false, length = 150)
    private String restaurantFullName;

    @Column(name = "restaurant_short_name", nullable = false, length = 50)
    private String restaurantShortName;

    @Column(name = "tagline", length = 150)
    private String tagline;

    @Column(name = "slogan", length = 150)
    private String slogan;

    @Column(name = "phone_number", length = 30)
    private String phoneNumber;

    @Column(name = "hotline_phone_number", length = 30)
    private String hotlinePhoneNumber;

    @Column(name = "email", length = 100)
    private String email;

    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "tax_number", length = 50)
    private String taxNumber;

    @Column(name = "website", length = 100)
    private String website;

    @Column(name = "currency", length = 15)
    private String currency;

    @Column(name = "tax_percentage", precision = 5, scale = 2)
    private BigDecimal taxPercentage;

    @Column(name = "service_charge_percentage", precision = 5, scale = 2)
    private BigDecimal serviceChargePercentage;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(name = "invoice_footer", length = 500)
    private String invoiceFooter;

    @Column(name = "terms_conditions", length = 1000)
    private String termsConditions;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;
}