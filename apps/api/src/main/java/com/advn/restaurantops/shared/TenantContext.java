package com.advn.restaurantops.shared;

import java.util.UUID;

public record TenantContext(UUID tenantId, UUID storeId, String role) {
    private static final ThreadLocal<TenantContext> CURRENT = new ThreadLocal<>();

    public static TenantContext get() {
        var context = CURRENT.get();
        if (context == null) throw new IllegalStateException("Tenant context is not available");
        return context;
    }

    public static void set(TenantContext context) { CURRENT.set(context); }
    public static void clear() { CURRENT.remove(); }
}

