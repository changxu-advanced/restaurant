package com.advn.restaurantops.closeout;

import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class CloseoutCalculator {
    public Result calculate(Input input) {
        long actualCash = input.cashCounts().stream().mapToLong(line -> line.denominationYen() * line.count()).sum();
        Long grossProfit = input.ingredientCostYen() == null ? null : input.salesYen() - input.ingredientCostYen();
        return new Result(input.salesYen(), input.expectedCashYen(), actualCash, actualCash - input.expectedCashYen(), grossProfit,
                input.laborCostYen(), grossProfit == null, grossProfit == null ? "原料原価が未取得です。" : null);
    }

    public record CashLine(long denominationYen, int count) {
        public CashLine { if (denominationYen <= 0 || count < 0) throw new IllegalArgumentException("現金枚数を確認してください。"); }
    }
    public record Input(long salesYen, long expectedCashYen, Long ingredientCostYen, long laborCostYen, List<CashLine> cashCounts) {}
    public record Result(long salesYen, long expectedCashYen, long actualCashYen, long cashDifferenceYen, Long grossProfitYen,
                         long laborCostYen, boolean provisional, String provisionalReason) {}
}

