package com.advn.restaurantops.handover;

import com.advn.restaurantops.shared.TenantContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/handovers")
public class HandoverController {
    private final HandoverRepository repository;
    public HandoverController(HandoverRepository repository) { this.repository = repository; }

    @GetMapping
    List<View> list() {
        var c = TenantContext.get();
        return repository.findAllByTenantIdAndStoreIdOrderByCreatedAtDesc(c.tenantId(), c.storeId()).stream().map(View::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    View create(@Valid @RequestBody Create request) {
        var c = TenantContext.get();
        return View.from(repository.save(new HandoverEntity(c.tenantId(), c.storeId(), request.category(), request.severity(), request.summary())));
    }

    @PatchMapping("/{id}/resolve")
    @Transactional
    View resolve(@PathVariable UUID id) {
        var c = TenantContext.get();
        var entity = repository.findByIdAndTenantIdAndStoreId(id, c.tenantId(), c.storeId())
                .orElseThrow(() -> new IllegalArgumentException("対象の引き継ぎが見つかりません。"));
        entity.resolve(); return View.from(entity);
    }

    record Create(@NotBlank String category, @Pattern(regexp = "LOW|MEDIUM|HIGH") String severity, @NotBlank @Size(max = 240) String summary) {}
    record View(UUID id, String category, String severity, String summary, String status, OffsetDateTime createdAt, long version) {
        static View from(HandoverEntity value) { return new View(value.getId(), value.getCategory(), value.getSeverity(), value.getSummary(), value.getStatus(), value.getCreatedAt(), value.getVersion()); }
    }
}

