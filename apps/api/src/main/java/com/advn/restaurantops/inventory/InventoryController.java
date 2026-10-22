package com.advn.restaurantops.inventory;

import com.advn.restaurantops.shared.TenantContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/inventory")
public class InventoryController {
    private final InventoryRepository repository;
    public InventoryController(InventoryRepository repository) { this.repository = repository; }

    @GetMapping
    List<ItemView> list() {
        var context = TenantContext.get();
        return repository.findAllByTenantIdAndStoreIdOrderByName(context.tenantId(), context.storeId()).stream().map(ItemView::from).toList();
    }

    @PatchMapping("/{id}/state")
    @Transactional
    ResponseEntity<ItemView> changeState(@PathVariable UUID id, @Valid @RequestBody ChangeState request) {
        var context = TenantContext.get();
        var item = repository.findByIdAndTenantIdAndStoreId(id, context.tenantId(), context.storeId())
                .orElseThrow(() -> new IllegalArgumentException("対象の在庫品目が見つかりません。"));
        item.changeState(request.state());
        return ResponseEntity.ok(ItemView.from(item));
    }

    record ChangeState(@Pattern(regexp = "ENOUGH|LOW|URGENT|OUT") String state, long version) {}
    record ItemView(UUID id, String name, String japaneseTerm, String state, String forecast, String recommendation, OffsetDateTime checkedAt, long version) {
        static ItemView from(InventoryItemEntity item) { return new ItemView(item.getId(), item.getName(), item.getJapaneseTerm(), item.getStockState(), item.getForecastText(), item.getRecommendationText(), item.getCheckedAt(), item.getVersion()); }
    }
}

