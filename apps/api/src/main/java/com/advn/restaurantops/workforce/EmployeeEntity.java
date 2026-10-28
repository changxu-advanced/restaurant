package com.advn.restaurantops.workforce;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.UUID;
import java.time.LocalDate;

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
    @Column(nullable = false) private String status = "ACTIVE";
    @Column private String phone;
    @Column(name = "hourly_wage_yen") private Integer hourlyWageYen;
    @Column(name = "experience_months", nullable = false) private int experienceMonths;
    @Column(name = "commute_minutes", nullable = false) private int commuteMinutes;
    @Column(nullable = false) private String traits = "";
    @Column(nullable = false) private String notes = "";
    @Column(name = "outside_work_minutes", nullable = false) private int outsideWorkMinutes;
    @Column(name = "residence_status") private String residenceStatus;
    @Column(name = "residence_expiry_date") private LocalDate residenceExpiryDate;
    @Column(name = "labor_rule_code", nullable = false) private String laborRuleCode = "PART_TIME";
    @Version private long version;

    protected EmployeeEntity() {}
    public EmployeeEntity(UUID id, UUID tenantId, UUID storeId, String displayName, String employmentType, String roleTitle,
                          int weeklyMinutes, int weeklyLimitMinutes, String skillSummary) {
        this.id = id; this.tenantId = tenantId; this.storeId = storeId; this.displayName = displayName;
        this.employmentType = employmentType; this.roleTitle = roleTitle; this.weeklyMinutes = weeklyMinutes;
        this.weeklyLimitMinutes = weeklyLimitMinutes; this.skillSummary = skillSummary == null ? "" : skillSummary;
    }
    public UUID getId() { return id; }
    public String getDisplayName() { return displayName; }
    public String getEmploymentType() { return employmentType; }
    public String getRoleTitle() { return roleTitle; }
    public int getWeeklyMinutes() { return weeklyMinutes; }
    public int getWeeklyLimitMinutes() { return weeklyLimitMinutes; }
    public String getSkillSummary() { return skillSummary; }
    public long getVersion() { return version; }
    public UUID getTenantId() { return tenantId; }
    public UUID getStoreId() { return storeId; }
    public String getStatus() { return status; }
    public String getPhone() { return phone; }
    public Integer getHourlyWageYen() { return hourlyWageYen; }
    public int getExperienceMonths() { return experienceMonths; }
    public int getCommuteMinutes() { return commuteMinutes; }
    public String getTraits() { return traits; }
    public String getNotes() { return notes; }
    public int getOutsideWorkMinutes() { return outsideWorkMinutes; }
    public String getResidenceStatus() { return residenceStatus; }
    public LocalDate getResidenceExpiryDate() { return residenceExpiryDate; }
    public String getLaborRuleCode() { return laborRuleCode; }

    public void update(String displayName, String employmentType, String roleTitle, Integer hourlyWageYen,
                       int experienceMonths, int commuteMinutes, String phone, String traits, String notes,
                       int outsideWorkMinutes, String residenceStatus, LocalDate residenceExpiryDate,
                       String laborRuleCode, int weeklyLimitMinutes) {
        if (displayName == null || displayName.isBlank()) throw new IllegalArgumentException("氏名を入力してください。");
        if (hourlyWageYen != null && hourlyWageYen < 0) throw new IllegalArgumentException("時給は0以上で入力してください。");
        if (experienceMonths < 0 || commuteMinutes < 0 || outsideWorkMinutes < 0) throw new IllegalArgumentException("数値項目を確認してください。");
        this.displayName = displayName.trim(); this.employmentType = employmentType; this.roleTitle = roleTitle;
        this.hourlyWageYen = hourlyWageYen; this.experienceMonths = experienceMonths; this.commuteMinutes = commuteMinutes;
        this.phone = phone; this.traits = traits == null ? "" : traits; this.notes = notes == null ? "" : notes;
        this.outsideWorkMinutes = outsideWorkMinutes; this.residenceStatus = residenceStatus; this.residenceExpiryDate = residenceExpiryDate;
        this.laborRuleCode = laborRuleCode; this.weeklyLimitMinutes = weeklyLimitMinutes;
    }

    public void deactivate() { this.status = "INACTIVE"; }

    public void placeOnLeave() {
        if (!"ACTIVE".equals(this.status)) throw new IllegalArgumentException("在職中のスタッフのみ休職にできます。");
        this.status = "ON_LEAVE";
    }

    public void reactivate() {
        if (!"ON_LEAVE".equals(this.status)) throw new IllegalArgumentException("休職中のスタッフのみ復職できます。");
        this.status = "ACTIVE";
    }
}

