package com.rms.polkole.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "payment_methods")
public class PaymentMethod {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "method_name", length = 50)
    private String methodName;

    @OneToMany(mappedBy = "paymentMethod")
    private Set<Payment> payments = new LinkedHashSet<>();

}