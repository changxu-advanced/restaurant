package com.advn.restaurantops.workforce;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface EmployeeTrainingRepository extends JpaRepository<EmployeeTrainingEntity, UUID> {
    List<EmployeeTrainingEntity> findAllByTenantIdAndStoreIdAndEmployeeId(UUID tenantId, UUID storeId, UUID employeeId);
}
