package com.advn.restaurantops.workforce;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "employee_skills")
public class EmployeeSkillEntity {
    @Id private UUID id;
    @Column(name = "tenant_id", nullable = false) private UUID tenantId;
    @Column(name = "store_id", nullable = false) private UUID storeId;
    @Column(name = "employee_id", nullable = false) private UUID employeeId;
    @Column(nullable = false) private String area;
    @Column(name = "position_name", nullable = false) private String positionName;
    @Column(nullable = false) private String level;
    @Column(nullable = false) private boolean independent;
    @Column(name = "can_train", nullable = false) private boolean canTrain;

    protected EmployeeSkillEntity() {}
    public EmployeeSkillEntity(UUID id, UUID tenantId, UUID storeId, UUID employeeId, String area, String positionName, String level, boolean independent, boolean canTrain) {
        this.id = id; this.tenantId = tenantId; this.storeId = storeId; this.employeeId = employeeId; this.area = area; this.positionName = positionName; this.level = level; this.independent = independent; this.canTrain = canTrain;
    }
    public UUID getId() { return id; }
    public String getArea() { return area; }
    public String getPositionName() { return positionName; }
    public String getLevel() { return level; }
    public boolean isIndependent() { return independent; }
    public boolean isCanTrain() { return canTrain; }
}
