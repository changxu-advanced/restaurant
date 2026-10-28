package com.advn.restaurantops.workforce;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "employee_training_progress")
public class EmployeeTrainingEntity {
    @Id private UUID id;
    @Column(name = "tenant_id", nullable = false) private UUID tenantId;
    @Column(name = "store_id", nullable = false) private UUID storeId;
    @Column(name = "employee_id", nullable = false) private UUID employeeId;
    @Column(name = "training_key", nullable = false) private String trainingKey;
    @Column(nullable = false) private String status;
    @Column(name = "confirmed_by") private UUID confirmedBy;
    @Column(name = "confirmed_at") private Instant confirmedAt;

    protected EmployeeTrainingEntity() {}
    public EmployeeTrainingEntity(UUID id, UUID tenantId, UUID storeId, UUID employeeId, String trainingKey, String status) {
        this.id = id; this.tenantId = tenantId; this.storeId = storeId; this.employeeId = employeeId; this.trainingKey = trainingKey; this.status = status;
    }
    public UUID getId() { return id; }
    public String getTrainingKey() { return trainingKey; }
    public String getStatus() { return status; }
}
