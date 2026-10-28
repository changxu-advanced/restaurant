package com.advn.restaurantops.closeout;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.List;
import org.junit.jupiter.api.Test;

class CloseoutCalculatorTest {
    private final CloseoutCalculator calculator = new CloseoutCalculator();

    @Test void calculatesCashDifferenceAndGrossProfit() {
        var result = calculator.calculate(new CloseoutCalculator.Input(486_320, 83_600, 165_140L, 116_800,
                List.of(new CloseoutCalculator.CashLine(10_000, 3), new CloseoutCalculator.CashLine(5_000, 4), new CloseoutCalculator.CashLine(1_000, 26), new CloseoutCalculator.CashLine(500, 9), new CloseoutCalculator.CashLine(100, 31))));
        assertThat(result.cashDifferenceYen()).isZero();
        assertThat(result.grossProfitYen()).isEqualTo(321_180);
        assertThat(result.provisional()).isFalse();
    }

    @Test void neverTreatsMissingIngredientCostAsZero() {
        var result = calculator.calculate(new CloseoutCalculator.Input(100_000, 0, null, 20_000, List.of(new CloseoutCalculator.CashLine(1_000, 0))));
        assertThat(result.grossProfitYen()).isNull();
        assertThat(result.provisional()).isTrue();
    }
}

