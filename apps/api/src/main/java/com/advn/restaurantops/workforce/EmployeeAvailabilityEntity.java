package com.advn.restaurantops.workforce;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "employee_availability_preferences")
public class EmployeeAvailabilityEntity {
    @Id private UUID id;
    @Column(name = "tenant_id", nullable = false) private UUID tenantId;
    @Column(name = "store_id", nullable = false) private UUID storeId;
    @Column(name = "employee_id", nullable = false) private UUID employeeId;
    @Column(name = "effective_from", nullable = false) private LocalDate effectiveFrom;
    @Column(name = "effective_to", nullable = false) private LocalDate effectiveTo;
    @Column(nullable = false) private int weekday;
    @Column(name = "slot_start", nullable = false) private LocalTime slotStart;
    @Column(name = "slot_end", nullable = false) private LocalTime slotEnd;
    @Column(nullable = false) private String preference;

    protected EmployeeAvailabilityEntity() {}
    static EmployeeAvailabilityEntity create(UUID id, UUID tenantId, UUID storeId, UUID employeeId, EmployeeController.AvailabilityItem item) {
        var start = LocalTime.parse(item.slotStart()); var end = LocalTime.parse(item.slotEnd());
        if (item.weekday() < 1 || item.weekday() > 7 || !end.isAfter(start) || item.effectiveTo().isBefore(item.effectiveFrom())) throw new IllegalArgumentException("希望時間帯を確認してください。");
        var entity = new EmployeeAvailabilityEntity(); entity.id = id; entity.tenantId = tenantId; entity.storeId = storeId; entity.employeeId = employeeId;
        entity.effectiveFrom = item.effectiveFrom(); entity.effectiveTo = item.effectiveTo(); entity.weekday = item.weekday(); entity.slotStart = start; entity.slotEnd = end; entity.preference = item.preference(); return entity;
    }
    public UUID getId() { return id; }
    public LocalDate getEffectiveFrom() { return effectiveFrom; }
    public LocalDate getEffectiveTo() { return effectiveTo; }
    public int getWeekday() { return weekday; }
    public LocalTime getSlotStart() { return slotStart; }
    public LocalTime getSlotEnd() { return slotEnd; }
    public String getPreference() { return preference; }
}
