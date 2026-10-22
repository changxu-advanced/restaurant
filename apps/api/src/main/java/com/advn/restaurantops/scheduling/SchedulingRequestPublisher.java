package com.advn.restaurantops.scheduling;

import java.util.UUID;

public interface SchedulingRequestPublisher {
    void publish(UUID jobId, UUID tenantId, UUID storeId);
}

