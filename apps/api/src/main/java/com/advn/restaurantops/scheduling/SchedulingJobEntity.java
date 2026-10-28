package com.advn.restaurantops.scheduling;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "scheduling_jobs")
public class SchedulingJobEntity {
    @Id private UUID id;
    @Column(name = "tenant_id", nullable = false) private UUID tenantId;
    @Column(name = "store_id", nullable = false) private UUID storeId;
    @Column(name = "period_start", nullable = false) private java.time.LocalDate periodStart;
    @Column(name = "period_end", nullable = false) private java.time.LocalDate periodEnd;
    @Column(nullable = false) private String status;
    @Column(name = "unmet_demand", nullable = false) private int unmetDemand;
    @Column(name = "score_percent") private Integer scorePercent;
    @Column(name = "failure_reason") private String failureReason;
    @Column(name = "created_at", nullable = false) private OffsetDateTime createdAt;
    @Version private long version;

    protected SchedulingJobEntity() {}
    SchedulingJobEntity(UUID tenantId, UUID storeId, java.time.LocalDate start, java.time.LocalDate end) {
        id = UUID.randomUUID(); this.tenantId = tenantId; this.storeId = storeId; periodStart = start; periodEnd = end;
        status = "QUEUED"; unmetDemand = 0; createdAt = OffsetDateTime.now();
    }
    public UUID getId() { return id; }
    public java.time.LocalDate getPeriodStart() { return periodStart; }
    public java.time.LocalDate getPeriodEnd() { return periodEnd; }
    public String getStatus() { return status; }
    public int getUnmetDemand() { return unmetDemand; }
    public Integer getScorePercent() { return scorePercent; }
    public String getFailureReason() { return failureReason; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public long getVersion() { return version; }
}

