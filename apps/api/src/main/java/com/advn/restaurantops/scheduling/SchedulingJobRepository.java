package com.advn.restaurantops.scheduling;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface SchedulingJobRepository extends JpaRepository<SchedulingJobEntity, UUID> {
    Optional<SchedulingJobEntity> findByIdAndTenantIdAndStoreId(UUID id, UUID tenantId, UUID storeId);
}

