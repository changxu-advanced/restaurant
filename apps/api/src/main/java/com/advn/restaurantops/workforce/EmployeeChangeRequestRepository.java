package com.advn.restaurantops.workforce;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface EmployeeChangeRequestRepository extends JpaRepository<EmployeeChangeRequestEntity, UUID> {
    List<EmployeeChangeRequestEntity> findAllByTenantIdAndStoreIdAndEmployeeIdOrderBySubmittedAtDesc(UUID tenantId, UUID storeId, UUID employeeId);
    Optional<EmployeeChangeRequestEntity> findByIdAndTenantIdAndStoreIdAndEmployeeId(UUID id, UUID tenantId, UUID storeId, UUID employeeId);
}
