package com.advn.restaurantops.workforce;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "employee_change_requests")
public class EmployeeChangeRequestEntity {
    @Id private UUID id;
    @Column(name = "tenant_id", nullable = false) private UUID tenantId;
    @Column(name = "store_id", nullable = false) private UUID storeId;
    @Column(name = "employee_id", nullable = false) private UUID employeeId;
    @Column(name = "payload_json", nullable = false, columnDefinition = "text") private String payloadJson;
    @Column(nullable = false) private String status = "PENDING";
    @Column(name = "submitted_at", nullable = false) private Instant submittedAt = Instant.now();
    @Column(name = "reviewed_at") private Instant reviewedAt;
    @Column(name = "review_reason") private String reviewReason;
    protected EmployeeChangeRequestEntity() {}
    public EmployeeChangeRequestEntity(UUID id, UUID tenantId, UUID storeId, UUID employeeId, String payloadJson) { this.id = id; this.tenantId = tenantId; this.storeId = storeId; this.employeeId = employeeId; this.payloadJson = payloadJson; }
    public UUID getId() { return id; }
    public UUID getEmployeeId() { return employeeId; }
    public String getPayloadJson() { return payloadJson; }
    public String getStatus() { return status; }
    public Instant getSubmittedAt() { return submittedAt; }
    public Instant getReviewedAt() { return reviewedAt; }
    public String getReviewReason() { return reviewReason; }
    public void approve() { status = "APPROVED"; reviewedAt = Instant.now(); }
    public void reject(String reason) { status = "REJECTED"; reviewReason = reason; reviewedAt = Instant.now(); }
}
