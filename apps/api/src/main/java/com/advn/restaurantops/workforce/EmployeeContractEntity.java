package com.advn.restaurantops.workforce;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "employee_contracts")
public class EmployeeContractEntity {
    @Id private UUID id;
    @Column(name = "tenant_id", nullable = false) private UUID tenantId;
    @Column(name = "store_id", nullable = false) private UUID storeId;
    @Column(name = "employee_id", nullable = false) private UUID employeeId;
    @Column(name = "contract_type", nullable = false) private String contractType;
    @Column(name = "starts_on", nullable = false) private LocalDate startsOn;
    @Column(name = "ends_on") private LocalDate endsOn;
    @Column(name = "target_minutes", nullable = false) private int targetMinutes;
    @Column(name = "limit_minutes", nullable = false) private int limitMinutes;
    @Column(name = "late_shift_allowed", nullable = false) private boolean lateShiftAllowed;

    protected EmployeeContractEntity() {}
    public EmployeeContractEntity(UUID id, UUID tenantId, UUID storeId, UUID employeeId, String contractType, LocalDate startsOn, LocalDate endsOn, int targetMinutes, int limitMinutes, boolean lateShiftAllowed) {
        this.id = id; this.tenantId = tenantId; this.storeId = storeId; this.employeeId = employeeId; this.contractType = contractType; this.startsOn = startsOn; this.endsOn = endsOn; this.targetMinutes = targetMinutes; this.limitMinutes = limitMinutes; this.lateShiftAllowed = lateShiftAllowed;
    }
    public UUID getId() { return id; }
    public String getContractType() { return contractType; }
    public LocalDate getStartsOn() { return startsOn; }
    public LocalDate getEndsOn() { return endsOn; }
    public int getTargetMinutes() { return targetMinutes; }
    public int getLimitMinutes() { return limitMinutes; }
    public boolean isLateShiftAllowed() { return lateShiftAllowed; }
    public void updateHours(int targetMinutes, int limitMinutes) {
        if (targetMinutes <= 0 || limitMinutes < targetMinutes) throw new IllegalArgumentException("契約時間を確認してください。");
        this.targetMinutes = targetMinutes; this.limitMinutes = limitMinutes;
    }
}
