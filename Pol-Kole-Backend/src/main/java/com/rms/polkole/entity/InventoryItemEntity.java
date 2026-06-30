package com.rms.polkole.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;
import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "inventory_items")
@SQLDelete(sql = "UPDATE inventory_items SET is_deleted = true WHERE id = ?")
@SQLRestriction("is_deleted = false")
public class InventoryItemEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @Column(name = "item_name", nullable = false, unique = true, length = 150)
    private String itemName;

    @Column(name = "quantity", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantity;

    @Column(name = "unit", nullable = false, length = 20)
    private String unit; // KG, LITER, UNIT, BOX, etc.

    @Column(name = "supplier", length = 150)
    private String supplier;

    @Column(name = "expiry_date")
    private Instant expiryDate;

    @Column(name = "minimum_stock_level", nullable = false, precision = 10, scale = 2)
    private BigDecimal minimumStockLevel; // Triggers alert if quantity is less than this

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;
}
