package com.advn.restaurantops.handover;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "handover_cards")
public class HandoverEntity {
    @Id private UUID id;
    @Column(name = "tenant_id", nullable = false) private UUID tenantId;
    @Column(name = "store_id", nullable = false) private UUID storeId;
    @Column(nullable = false) private String category;
    @Column(nullable = false) private String severity;
    @Column(nullable = false) private String summary;
    @Column(nullable = false) private String status;
    @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt;
    @Version private long version;

    protected HandoverEntity() {}
    HandoverEntity(UUID tenantId, UUID storeId, String category, String severity, String summary) {
        this.id = UUID.randomUUID(); this.tenantId = tenantId; this.storeId = storeId; this.category = category;
        this.severity = severity; this.summary = summary; this.status = "OPEN"; this.createdAt = OffsetDateTime.now();
    }
    public UUID getId() { return id; }
    public String getCategory() { return category; }
    public String getSeverity() { return severity; }
    public String getSummary() { return summary; }
    public String getStatus() { return status; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public long getVersion() { return version; }
    void resolve() { this.status = "RESOLVED"; }
}

