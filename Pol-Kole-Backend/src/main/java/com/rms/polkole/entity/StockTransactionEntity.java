package com.rms.polkole.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "stock_transactions")
public class StockTransactionEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "inventory_item_id", nullable = false)
    private InventoryItemEntity inventoryItem;

    @Column(name = "transaction_type", nullable = false, length = 20)
    private String transactionType; // IN (for restocking), OUT (for consumption / waste)

    @Column(name = "quantity", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantity;

    @Column(name = "reason", length = 200)
    private String reason; // Purchase, Spoilage, Waste, Customer Order Deduct

    @Column(name = "transaction_time", nullable = false)
    private Instant transactionTime;

    @PrePersist
    protected void onCreate() {
        if (transactionTime == null) {
            transactionTime = Instant.now();
        }
    }
}
