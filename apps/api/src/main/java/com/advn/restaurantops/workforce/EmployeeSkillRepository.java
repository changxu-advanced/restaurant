package com.advn.restaurantops.workforce;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface EmployeeSkillRepository extends JpaRepository<EmployeeSkillEntity, UUID> {
    List<EmployeeSkillEntity> findAllByTenantIdAndStoreIdAndEmployeeId(UUID tenantId, UUID storeId, UUID employeeId);
    void deleteAllByTenantIdAndStoreIdAndEmployeeId(UUID tenantId, UUID storeId, UUID employeeId);
}
