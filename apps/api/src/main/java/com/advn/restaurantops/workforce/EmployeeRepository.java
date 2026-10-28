package com.advn.restaurantops.workforce;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface EmployeeRepository extends JpaRepository<EmployeeEntity, UUID> {
    List<EmployeeEntity> findAllByTenantIdAndStoreIdOrderByDisplayName(UUID tenantId, UUID storeId);
    java.util.Optional<EmployeeEntity> findByIdAndTenantIdAndStoreId(UUID id, UUID tenantId, UUID storeId);
}

