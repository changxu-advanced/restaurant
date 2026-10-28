package com.advn.restaurantops.workforce;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface EmployeeContractRepository extends JpaRepository<EmployeeContractEntity, UUID> {
    Optional<EmployeeContractEntity> findFirstByTenantIdAndStoreIdAndEmployeeIdOrderByStartsOnDesc(UUID tenantId, UUID storeId, UUID employeeId);
}
