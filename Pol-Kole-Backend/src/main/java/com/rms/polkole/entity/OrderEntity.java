package com.rms.polkole.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "orders")
public class OrderEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "table_id")
    private RestaurantTableEntity table;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private CustomerEntity customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "waiter_id")
    private UserEntity waiter;

    @ColumnDefault("CURRENT_TIMESTAMP")
    @Column(name = "order_time")
    private Instant orderTime;

    @Lob
    @Column(name = "notes")
    private String notes;

    @ColumnDefault("'DINE_IN'")
    @Lob
    @Column(name = "order_type")
    private String orderType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_status_id", nullable = false)
    private OrderStatusEntity orderStatus;

    @OneToOne(mappedBy = "order")
    private BillEntity bill;

    @OneToMany(mappedBy = "order")
    private Set<OrderItemEntity> orderItems = new LinkedHashSet<>();

}
