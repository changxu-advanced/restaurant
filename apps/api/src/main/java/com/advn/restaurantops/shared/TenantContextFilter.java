package com.advn.restaurantops.shared;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class TenantContextFilter extends OncePerRequestFilter {
    private final UUID demoTenantId;
    private final UUID demoStoreId;

    public TenantContextFilter(
            @Value("${app.demo-tenant-id}") UUID demoTenantId,
            @Value("${app.demo-store-id}") UUID demoStoreId) {
        this.demoTenantId = demoTenantId;
        this.demoStoreId = demoStoreId;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return request.getRequestURI().startsWith("/actuator") || request.getRequestURI().startsWith("/docs") || request.getRequestURI().startsWith("/v3/api-docs");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        var tenantId = demoTenantId;
        var storeId = demoStoreId;
        var role = Optional.ofNullable(request.getHeader("X-Demo-Role")).orElse("MANAGER");
        if (authentication instanceof JwtAuthenticationToken jwt) {
            tenantId = UUID.fromString(jwt.getToken().getClaimAsString("custom:tenant_id"));
            storeId = UUID.fromString(jwt.getToken().getClaimAsString("custom:store_id"));
            role = Optional.ofNullable(jwt.getToken().getClaimAsString("custom:role")).orElse("STAFF");
        }
        TenantContext.set(new TenantContext(tenantId, storeId, role));
        try { chain.doFilter(request, response); } finally { TenantContext.clear(); }
    }
}

