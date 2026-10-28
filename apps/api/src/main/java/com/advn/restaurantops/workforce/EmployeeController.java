package com.advn.restaurantops.workforce;

import com.advn.restaurantops.shared.TenantContext;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/employees")
@Transactional
public class EmployeeController {
    @PersistenceContext private EntityManager entityManager;
    private final EmployeeRepository repository;
    private final LaborWarningPolicy warningPolicy;
    private final EmployeeSkillRepository skillRepository;
    private final EmployeeAvailabilityRepository availabilityRepository;
    private final EmployeeContractRepository contractRepository;
    private final EmployeeTrainingRepository trainingRepository;

    public EmployeeController(EmployeeRepository repository, LaborWarningPolicy warningPolicy,
                               EmployeeSkillRepository skillRepository,
                               EmployeeAvailabilityRepository availabilityRepository,
                               EmployeeContractRepository contractRepository,
                               EmployeeTrainingRepository trainingRepository) {
        this.repository = repository; this.warningPolicy = warningPolicy;
        this.skillRepository = skillRepository; this.availabilityRepository = availabilityRepository; this.contractRepository = contractRepository; this.trainingRepository = trainingRepository;
    }

    @GetMapping
    List<EmployeeView> list(@RequestParam(required = false) String query,
                            @RequestParam(required = false) String status,
                            @RequestParam(required = false) String employmentType,
                            @RequestParam(required = false) String roleTitle,
                            @RequestParam(required = false) String warning) {
        var context = currentTenant();
        return repository.findAllByTenantIdAndStoreIdOrderByDisplayName(context.tenantId(), context.storeId()).stream()
                .filter(employee -> query == null || employee.getDisplayName().toLowerCase().contains(query.toLowerCase()))
                .filter(employee -> status == null || status.equals(employee.getStatus()))
                .filter(employee -> employmentType == null || employmentType.equals(employee.getEmploymentType()))
                .filter(employee -> roleTitle == null || employee.getRoleTitle().contains(roleTitle))
                .map(this::toView)
                .filter(employee -> warning == null || warning.equals(employee.warning().level()))
                .toList();
    }

    @GetMapping("/{id}")
    EmployeeDetail detail(@PathVariable UUID id) {
        var employee = findOwned(id); var context = currentTenant();
        var contract = contractRepository.findFirstByTenantIdAndStoreIdAndEmployeeIdOrderByStartsOnDesc(context.tenantId(), context.storeId(), id).map(value -> new ContractView(value.getId(), value.getContractType(), value.getStartsOn(), value.getEndsOn(), value.getTargetMinutes(), value.getLimitMinutes(), value.isLateShiftAllowed())).orElse(null);
        var skills = skillRepository.findAllByTenantIdAndStoreIdAndEmployeeId(context.tenantId(), context.storeId(), id).stream()
                .map(skill -> new SkillView(skill.getId(), skill.getArea(), skill.getPositionName(), skill.getLevel(), skill.isIndependent(), skill.isCanTrain())).toList();
        var availability = availabilityRepository.findAllByTenantIdAndStoreIdAndEmployeeIdOrderByWeekdayAscSlotStartAsc(context.tenantId(), context.storeId(), id).stream()
                .map(slot -> new AvailabilityView(slot.getId(), slot.getEffectiveFrom(), slot.getEffectiveTo(), slot.getWeekday(), slot.getSlotStart().toString(), slot.getSlotEnd().toString(), slot.getPreference())).toList();
        var training = trainingRepository.findAllByTenantIdAndStoreIdAndEmployeeId(context.tenantId(), context.storeId(), id).stream().map(item -> new TrainingView(item.getId(), item.getTrainingKey(), item.getStatus())).toList();
        var profile = isManager() ? new ProfileView(employee.getPhone(), employee.getHourlyWageYen(), employee.getExperienceMonths(), employee.getCommuteMinutes(), employee.getTraits(), employee.getNotes(), employee.getOutsideWorkMinutes(), employee.getResidenceStatus(), employee.getResidenceExpiryDate(), employee.getLaborRuleCode()) : new ProfileView(null, null, employee.getExperienceMonths(), employee.getCommuteMinutes(), "", "", employee.getOutsideWorkMinutes(), null, null, employee.getLaborRuleCode());
        return new EmployeeDetail(toView(employee), profile, contract, skills, training, availability);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    EmployeeView create(@Valid @RequestBody EmployeeRequest request) {
        requireManager(); var context = currentTenant();
        var employee = new EmployeeEntity(UUID.randomUUID(), context.tenantId(), context.storeId(), request.displayName(), request.employmentType(), request.roleTitle(), 0, request.weeklyLimitMinutes(), String.join(",", request.skills()));
        employee.update(request.displayName(), request.employmentType(), request.roleTitle(), request.hourlyWageYen(), request.experienceMonths(), request.commuteMinutes(), request.phone(), request.traits(), request.notes(), request.outsideWorkMinutes(), request.residenceStatus(), request.residenceExpiryDate(), request.laborRuleCode(), request.weeklyLimitMinutes());
        repository.save(employee);
        contractRepository.save(new EmployeeContractEntity(UUID.randomUUID(), context.tenantId(), context.storeId(), employee.getId(), request.employmentType(), LocalDate.now(), null, 0, request.contractTargetMinutesOrWeekly(), request.contractLimitMinutesOrWeekly(), false));
        return toView(employee);
    }

    @PatchMapping("/{id}")
    EmployeeView update(@PathVariable UUID id, @Valid @RequestBody EmployeeRequest request) {
        requireManager(); var employee = findOwned(id); var context = currentTenant();
        employee.update(request.displayName(), request.employmentType(), request.roleTitle(), request.hourlyWageYen(), request.experienceMonths(), request.commuteMinutes(), request.phone(), request.traits(), request.notes(), request.outsideWorkMinutes(), request.residenceStatus(), request.residenceExpiryDate(), request.laborRuleCode(), request.weeklyLimitMinutes());
        contractRepository.findFirstByTenantIdAndStoreIdAndEmployeeIdOrderByStartsOnDesc(context.tenantId(), context.storeId(), id).ifPresent(contract -> contract.updateHours(request.contractTargetMinutesOrWeekly(), request.contractLimitMinutesOrWeekly()));
        return toView(repository.save(employee));
    }

    @PostMapping("/{id}/deactivate")
    EmployeeView deactivate(@PathVariable UUID id) {
        requireManager(); var employee = findOwned(id); employee.deactivate(); return toView(repository.save(employee));
    }

    @PostMapping("/{id}/leave")
    EmployeeView leave(@PathVariable UUID id) {
        requireManager(); var employee = findOwned(id); employee.placeOnLeave(); return toView(repository.save(employee));
    }

    @PostMapping("/{id}/reactivate")
    EmployeeView reactivate(@PathVariable UUID id) {
        requireManager(); var employee = findOwned(id); employee.reactivate(); return toView(repository.save(employee));
    }

    @PutMapping("/{id}/skills")
    List<SkillView> replaceSkills(@PathVariable UUID id, @Valid @RequestBody SkillRequest request) {
        requireManager(); findOwned(id); var context = currentTenant();
        skillRepository.deleteAllByTenantIdAndStoreIdAndEmployeeId(context.tenantId(), context.storeId(), id);
        return request.skills().stream().map(skill -> skillRepository.save(new EmployeeSkillEntity(UUID.randomUUID(), context.tenantId(), context.storeId(), id, skill.area(), skill.positionName(), skill.level(), skill.independent(), skill.canTrain())))
                .map(skill -> new SkillView(skill.getId(), skill.getArea(), skill.getPositionName(), skill.getLevel(), skill.isIndependent(), skill.isCanTrain())).toList();
    }

    @PutMapping("/{id}/availability")
    List<AvailabilityView> replaceAvailability(@PathVariable UUID id, @Valid @RequestBody AvailabilityRequest request) {
        requireManager(); findOwned(id); var context = currentTenant();
        availabilityRepository.deleteAllByTenantIdAndStoreIdAndEmployeeId(context.tenantId(), context.storeId(), id);
        return request.slots().stream().map(slot -> availabilityRepository.save(EmployeeAvailabilityEntity.create(UUID.randomUUID(), context.tenantId(), context.storeId(), id, slot)))
                .map(slot -> new AvailabilityView(slot.getId(), slot.getEffectiveFrom(), slot.getEffectiveTo(), slot.getWeekday(), slot.getSlotStart().toString(), slot.getSlotEnd().toString(), slot.getPreference())).toList();
    }

    @PutMapping("/{id}/training")
    List<TrainingView> replaceTraining(@PathVariable UUID id, @Valid @RequestBody TrainingRequest request) {
        requireManager(); findOwned(id); var context = currentTenant();
        trainingRepository.deleteAll(trainingRepository.findAllByTenantIdAndStoreIdAndEmployeeId(context.tenantId(), context.storeId(), id));
        return request.items().stream().map(item -> trainingRepository.save(new EmployeeTrainingEntity(UUID.randomUUID(), context.tenantId(), context.storeId(), id, item.trainingKey(), item.status())))
                .map(item -> new TrainingView(item.getId(), item.getTrainingKey(), item.getStatus())).toList();
    }

    @GetMapping("/{id}/labor-warning")
    LaborWarningPolicy.Warning laborWarning(@PathVariable UUID id) {
        var employee = findOwned(id); return warningPolicy.evaluate(employee.getWeeklyMinutes() + employee.getOutsideWorkMinutes(), employee.getWeeklyLimitMinutes());
    }

    private EmployeeView toView(EmployeeEntity employee) {
        var warning = warningPolicy.evaluate(employee.getWeeklyMinutes() + employee.getOutsideWorkMinutes(), employee.getWeeklyLimitMinutes());
        var skills = Arrays.stream(employee.getSkillSummary().split(",")).filter(value -> !value.isBlank()).toList();
        return new EmployeeView(employee.getId(), employee.getDisplayName(), employee.getEmploymentType(), employee.getRoleTitle(), employee.getStatus(), skills, employee.getWeeklyMinutes(), employee.getOutsideWorkMinutes(), employee.getWeeklyLimitMinutes(), warning, employee.getVersion());
    }

    private EmployeeEntity findOwned(UUID id) {
        var context = currentTenant(); return repository.findByIdAndTenantIdAndStoreId(id, context.tenantId(), context.storeId()).orElseThrow(() -> new IllegalArgumentException("社員が見つかりません。"));
    }

    private TenantContext currentTenant() {
        var context = TenantContext.get();
        entityManager.createNativeQuery("select set_config('app.current_tenant', :tenant, true)").setParameter("tenant", context.tenantId().toString()).getSingleResult();
        return context;
    }

    private void requireManager() {
        if (!"MANAGER".equalsIgnoreCase(TenantContext.get().role()) && !"ADMIN".equalsIgnoreCase(TenantContext.get().role())) throw new IllegalArgumentException("この操作は店長権限が必要です。");
    }

    private boolean isManager() { return "MANAGER".equalsIgnoreCase(TenantContext.get().role()) || "ADMIN".equalsIgnoreCase(TenantContext.get().role()); }

    public record EmployeeView(UUID id, String displayName, String employmentType, String roleTitle, String status, List<String> skills,
                               int weeklyMinutes, int outsideWorkMinutes, int weeklyLimitMinutes, LaborWarningPolicy.Warning warning, long version) {}
    public record EmployeeDetail(EmployeeView employee, ProfileView profile, ContractView contract, List<SkillView> skills, List<TrainingView> training, List<AvailabilityView> availability) {}
    public record ProfileView(String phone, Integer hourlyWageYen, int experienceMonths, int commuteMinutes, String traits, String notes, int outsideWorkMinutes, String residenceStatus, LocalDate residenceExpiryDate, String laborRuleCode) {}
    public record SkillView(UUID id, String area, String positionName, String level, boolean independent, boolean canTrain) {}
    public record ContractView(UUID id, String contractType, LocalDate startsOn, LocalDate endsOn, int targetMinutes, int limitMinutes, boolean lateShiftAllowed) {}
    public record TrainingView(UUID id, String trainingKey, String status) {}
    public record AvailabilityView(UUID id, LocalDate effectiveFrom, LocalDate effectiveTo, int weekday, String slotStart, String slotEnd, String preference) {}

    public record EmployeeRequest(@NotBlank String displayName, @NotBlank String employmentType, @NotBlank String roleTitle,
                                  @Min(0) Integer hourlyWageYen, @Min(0) int experienceMonths, @Min(0) int commuteMinutes,
                                  String phone, String traits, String notes, @Min(0) int outsideWorkMinutes,
                                  String residenceStatus, LocalDate residenceExpiryDate, @NotBlank String laborRuleCode,
                                  @Min(1) int weeklyLimitMinutes, Integer contractTargetMinutes, Integer contractLimitMinutes, List<String> skills) {
        public EmployeeRequest { if (skills == null) skills = List.of(); }
        public int contractTargetMinutesOrWeekly() { return contractTargetMinutes == null ? weeklyLimitMinutes : contractTargetMinutes; }
        public int contractLimitMinutesOrWeekly() { return contractLimitMinutes == null ? weeklyLimitMinutes : contractLimitMinutes; }
    }
    public record SkillRequest(@NotNull List<SkillItem> skills) {}
    public record SkillItem(@NotBlank String area, @NotBlank String positionName, @NotBlank String level, boolean independent, boolean canTrain) {}
    public record AvailabilityRequest(@NotNull List<AvailabilityItem> slots) {}
    public record AvailabilityItem(@NotNull LocalDate effectiveFrom, @NotNull LocalDate effectiveTo, int weekday, @NotBlank String slotStart, @NotBlank String slotEnd, @NotBlank String preference) {}
    public record TrainingRequest(@NotNull List<TrainingItem> items) {}
    public record TrainingItem(@NotBlank String trainingKey, @NotBlank String status) {}
}
