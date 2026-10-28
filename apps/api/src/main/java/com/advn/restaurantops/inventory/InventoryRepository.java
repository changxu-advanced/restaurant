package com.advn.restaurantops.inventory;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface InventoryRepository extends JpaRepository<InventoryItemEntity, UUID> {
    List<InventoryItemEntity> findAllByTenantIdAndStoreIdOrderByName(UUID tenantId, UUID storeId);
    Optional<InventoryItemEntity> findByIdAndTenantIdAndStoreId(UUID id, UUID tenantId, UUID storeId);
}

