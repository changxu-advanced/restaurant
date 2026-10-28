package com.advn.restaurantops.workforce;

import com.advn.restaurantops.shared.TenantContext;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/employees/{employeeId}/change-requests")
@Transactional
public class EmployeeChangeRequestController {
    @PersistenceContext private EntityManager entityManager;
    private final EmployeeChangeRequestRepository repository;
    private final EmployeeRepository employees;
    private final EmployeeContractRepository contracts;
    private final ObjectMapper objectMapper;
    public EmployeeChangeRequestController(EmployeeChangeRequestRepository repository, EmployeeRepository employees, EmployeeContractRepository contracts, ObjectMapper objectMapper) { this.repository = repository; this.employees = employees; this.contracts = contracts; this.objectMapper = objectMapper; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ChangeRequestView submit(@PathVariable UUID employeeId, @RequestBody @NotNull Map<String, Object> payload) {
        var context = currentTenant(); findOwned(employeeId, context);
        try { return view(repository.save(new EmployeeChangeRequestEntity(UUID.randomUUID(), context.tenantId(), context.storeId(), employeeId, objectMapper.writeValueAsString(payload)))); }
        catch (JsonProcessingException error) { throw new IllegalArgumentException("变更内容无法保存。", error); }
    }

    @GetMapping
    List<ChangeRequestView> list(@PathVariable UUID employeeId) {
        var context = currentTenant(); findOwned(employeeId, context);
        return repository.findAllByTenantIdAndStoreIdAndEmployeeIdOrderBySubmittedAtDesc(context.tenantId(), context.storeId(), employeeId).stream().map(this::view).toList();
    }

    @PostMapping("/{requestId}/approve")
    EmployeeController.EmployeeView approve(@PathVariable UUID employeeId, @PathVariable UUID requestId) {
        requireManager(); var context = currentTenant(); findOwned(employeeId, context);
        var request = repository.findByIdAndTenantIdAndStoreIdAndEmployeeId(requestId, context.tenantId(), context.storeId(), employeeId).orElseThrow(() -> new IllegalArgumentException("变更申请不存在。"));
        var employee = findOwned(employeeId, context);
        try {
            var payload = objectMapper.readValue(request.getPayloadJson(), Map.class);
            employee.update((String) payload.getOrDefault("displayName", employee.getDisplayName()), employee.getEmploymentType(), employee.getRoleTitle(), employee.getHourlyWageYen(), employee.getExperienceMonths(), employee.getCommuteMinutes(), (String) payload.getOrDefault("phone", employee.getPhone()), employee.getTraits(), employee.getNotes(), employee.getOutsideWorkMinutes(), employee.getResidenceStatus(), employee.getResidenceExpiryDate(), employee.getLaborRuleCode(), employee.getWeeklyLimitMinutes());
            contracts.findFirstByTenantIdAndStoreIdAndEmployeeIdOrderByStartsOnDesc(context.tenantId(), context.storeId(), employeeId).ifPresent(contract -> contract.updateHours(intValue(payload.get("contractTargetMinutes"), contract.getTargetMinutes()), intValue(payload.get("contractLimitMinutes"), contract.getLimitMinutes())));
            employees.save(employee); request.approve(); return employeeView(employeeId, context);
        } catch (JsonProcessingException error) { throw new IllegalArgumentException("变更内容无法读取。", error); }
    }

    @PostMapping("/{requestId}/reject")
    ChangeRequestView reject(@PathVariable UUID employeeId, @PathVariable UUID requestId, @RequestBody(required = false) Map<String, String> body) {
        requireManager(); var context = currentTenant(); findOwned(employeeId, context);
        var request = repository.findByIdAndTenantIdAndStoreIdAndEmployeeId(requestId, context.tenantId(), context.storeId(), employeeId).orElseThrow(() -> new IllegalArgumentException("变更申请不存在。"));
        request.reject(body == null ? null : body.get("reason")); return view(request);
    }

    private EmployeeController.EmployeeView employeeView(UUID id, TenantContext context) { return employees.findByIdAndTenantIdAndStoreId(id, context.tenantId(), context.storeId()).map(employee -> new EmployeeController.EmployeeView(employee.getId(), employee.getDisplayName(), employee.getEmploymentType(), employee.getRoleTitle(), employee.getStatus(), List.of(), employee.getWeeklyMinutes(), employee.getOutsideWorkMinutes(), employee.getWeeklyLimitMinutes(), new LaborWarningPolicy.Warning("NORMAL", 0, "变更申请已确认"), employee.getVersion())).orElseThrow(); }
    private ChangeRequestView view(EmployeeChangeRequestEntity request) { return new ChangeRequestView(request.getId(), request.getEmployeeId(), request.getStatus(), request.getSubmittedAt(), request.getPayloadJson(), request.getReviewReason(), request.getReviewedAt()); }
    private EmployeeEntity findOwned(UUID id, TenantContext context) { return employees.findByIdAndTenantIdAndStoreId(id, context.tenantId(), context.storeId()).orElseThrow(() -> new IllegalArgumentException("员工不存在。")); }
    private int intValue(Object value, int fallback) { return value instanceof Number number ? number.intValue() : fallback; }
    private TenantContext currentTenant() { var context = TenantContext.get(); entityManager.createNativeQuery("select set_config('app.current_tenant', :tenant, true)").setParameter("tenant", context.tenantId().toString()).getSingleResult(); return context; }
    private void requireManager() { if (!"MANAGER".equalsIgnoreCase(TenantContext.get().role()) && !"ADMIN".equalsIgnoreCase(TenantContext.get().role())) throw new IllegalArgumentException("この操作は店長権限が必要です。"); }
    public record ChangeRequestView(UUID id, UUID employeeId, String status, Instant submittedAt, String payloadJson, String reason, Instant reviewedAt) {}
}
