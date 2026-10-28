package com.advn.restaurantops.workforce;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;

class LaborWarningPolicyTest {
    private final LaborWarningPolicy policy = new LaborWarningPolicy();

    @Test void returnsWarningAtEightyPercent() {
        assertThat(policy.evaluate(1_344, 1_680).level()).isEqualTo("APPROACHING");
    }

    @Test void blocksAtLimit() {
        assertThat(policy.evaluate(2_400, 2_400).level()).isEqualTo("ACTION");
    }
}

