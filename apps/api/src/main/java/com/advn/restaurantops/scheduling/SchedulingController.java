package com.advn.restaurantops.scheduling;

import com.advn.restaurantops.shared.TenantContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/scheduling-jobs")
public class SchedulingController {
    private final SchedulingJobRepository repository;
    private final SchedulingRequestPublisher publisher;

    public SchedulingController(SchedulingJobRepository repository, SchedulingRequestPublisher publisher) {
        this.repository = repository; this.publisher = publisher;
    }

    @PostMapping
    @Transactional
    ResponseEntity<JobView> create(@Valid @RequestBody CreateJob request) {
        if (request.periodEnd().isBefore(request.periodStart())) throw new IllegalArgumentException("終了日は開始日以降にしてください。");
        if (request.periodStart().plusDays(13).isBefore(request.periodEnd())) throw new IllegalArgumentException("シフト期間は最大14日です。");
        var c = TenantContext.get();
        var job = repository.save(new SchedulingJobEntity(c.tenantId(), c.storeId(), request.periodStart(), request.periodEnd()));
        publisher.publish(job.getId(), c.tenantId(), c.storeId());
        return ResponseEntity.accepted().location(URI.create("/api/v1/scheduling-jobs/" + job.getId())).body(JobView.from(job));
    }

    @GetMapping("/{id}")
    JobView get(@PathVariable UUID id) {
        var c = TenantContext.get();
        return repository.findByIdAndTenantIdAndStoreId(id, c.tenantId(), c.storeId()).map(JobView::from)
                .orElseThrow(() -> new IllegalArgumentException("排班タスクが見つかりません。"));
    }

    record CreateJob(@NotNull @FutureOrPresent LocalDate periodStart, @NotNull LocalDate periodEnd) {}
    record JobView(UUID jobId, String status, LocalDate periodStart, LocalDate periodEnd, int unmetDemand, Integer scorePercent, String failureReason, OffsetDateTime createdAt, long version) {
        static JobView from(SchedulingJobEntity job) { return new JobView(job.getId(), job.getStatus(), job.getPeriodStart(), job.getPeriodEnd(), job.getUnmetDemand(), job.getScorePercent(), job.getFailureReason(), job.getCreatedAt(), job.getVersion()); }
    }
}

