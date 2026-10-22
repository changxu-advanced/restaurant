package com.advn.restaurantops.inventory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "inventory_items")
public class InventoryItemEntity {
    @Id private UUID id;
    @Column(name = "tenant_id", nullable = false) private UUID tenantId;
    @Column(name = "store_id", nullable = false) private UUID storeId;
    @Column(nullable = false) private String name;
    @Column(name = "japanese_term", nullable = false) private String japaneseTerm;
    @Column(name = "stock_state", nullable = false) private String stockState;
    @Column(name = "forecast_text", nullable = false) private String forecastText;
    @Column(name = "recommendation_text") private String recommendationText;
    @Column(name = "checked_at") private OffsetDateTime checkedAt;
    @Version private long version;

    protected InventoryItemEntity() {}
    public UUID getId() { return id; }
    public String getName() { return name; }
    public String getJapaneseTerm() { return japaneseTerm; }
    public String getStockState() { return stockState; }
    public String getForecastText() { return forecastText; }
    public String getRecommendationText() { return recommendationText; }
    public OffsetDateTime getCheckedAt() { return checkedAt; }
    public long getVersion() { return version; }
    public void changeState(String state) { this.stockState = state; this.checkedAt = OffsetDateTime.now(); }
}

