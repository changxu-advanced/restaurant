package com.advn.restaurantops.workforce;

import com.advn.restaurantops.shared.TenantContext;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/employees")
public class EmployeeController {
    private final EmployeeRepository repository;
    private final LaborWarningPolicy warningPolicy;

    public EmployeeController(EmployeeRepository repository, LaborWarningPolicy warningPolicy) {
        this.repository = repository;
        this.warningPolicy = warningPolicy;
    }

    @GetMapping
    List<EmployeeView> list() {
        var context = TenantContext.get();
        return repository.findAllByTenantIdAndStoreIdOrderByDisplayName(context.tenantId(), context.storeId()).stream()
                .map(employee -> {
                    var warning = warningPolicy.evaluate(employee.getWeeklyMinutes(), employee.getWeeklyLimitMinutes());
                    return new EmployeeView(employee.getId(), employee.getDisplayName(), employee.getEmploymentType(), employee.getRoleTitle(),
                            Arrays.stream(employee.getSkillSummary().split(",")).toList(), employee.getWeeklyMinutes(), employee.getWeeklyLimitMinutes(), warning, employee.getVersion());
                }).toList();
    }

    record EmployeeView(UUID id, String displayName, String employmentType, String roleTitle, List<String> skills,
                        int weeklyMinutes, int weeklyLimitMinutes, LaborWarningPolicy.Warning warning, long version) {}
}

