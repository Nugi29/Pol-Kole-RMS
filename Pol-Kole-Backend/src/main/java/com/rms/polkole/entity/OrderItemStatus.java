package com.rms.polkole.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "order_item_status")
public class OrderItemStatus {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "status_name", length = 50)
    private String statusName;

    @Column(name = "description")
    private String description;

    @OneToMany(mappedBy = "orderItemStatus")
    private Set<OrderItem> orderItems = new LinkedHashSet<>();

}