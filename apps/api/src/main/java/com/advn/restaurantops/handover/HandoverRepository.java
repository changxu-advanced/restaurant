package com.advn.restaurantops.handover;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface HandoverRepository extends JpaRepository<HandoverEntity, UUID> {
    List<HandoverEntity> findAllByTenantIdAndStoreIdOrderByCreatedAtDesc(UUID tenantId, UUID storeId);
    Optional<HandoverEntity> findByIdAndTenantIdAndStoreId(UUID id, UUID tenantId, UUID storeId);
}

