package com.advn.restaurantops.workforce;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.UUID;

@Entity
@Table(name = "employees")
public class EmployeeEntity {
    @Id private UUID id;
    @Column(name = "tenant_id", nullable = false) private UUID tenantId;
    @Column(name = "store_id", nullable = false) private UUID storeId;
    @Column(name = "display_name", nullable = false) private String displayName;
    @Column(name = "employment_type", nullable = false) private String employmentType;
    @Column(name = "role_title", nullable = false) private String roleTitle;
    @Column(name = "weekly_minutes", nullable = false) private int weeklyMinutes;
    @Column(name = "weekly_limit_minutes", nullable = false) private int weeklyLimitMinutes;
    @Column(name = "skill_summary", nullable = false) private String skillSummary;
    @Version private long version;

    protected EmployeeEntity() {}
    public UUID getId() { return id; }
    public String getDisplayName() { return displayName; }
    public String getEmploymentType() { return employmentType; }
    public String getRoleTitle() { return roleTitle; }
    public int getWeeklyMinutes() { return weeklyMinutes; }
    public int getWeeklyLimitMinutes() { return weeklyLimitMinutes; }
    public String getSkillSummary() { return skillSummary; }
    public long getVersion() { return version; }
}

