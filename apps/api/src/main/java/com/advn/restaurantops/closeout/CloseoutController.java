package com.advn.restaurantops.closeout;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/closeouts")
public class CloseoutController {
    private final CloseoutCalculator calculator;
    public CloseoutController(CloseoutCalculator calculator) { this.calculator = calculator; }

    @PostMapping("/preview")
    CloseoutCalculator.Result preview(@Valid @RequestBody PreviewRequest request) {
        return calculator.calculate(new CloseoutCalculator.Input(request.salesYen(), request.expectedCashYen(), request.ingredientCostYen(), request.laborCostYen(),
                request.cashCounts().stream().map(c -> new CloseoutCalculator.CashLine(c.denominationYen(), c.count())).toList()));
    }

    record PreviewRequest(@Min(0) long salesYen, @Min(0) long expectedCashYen, Long ingredientCostYen, @Min(0) long laborCostYen, @NotEmpty List<@Valid CashCount> cashCounts) {}
    record CashCount(@Min(1) long denominationYen, @Min(0) int count) {}
}

