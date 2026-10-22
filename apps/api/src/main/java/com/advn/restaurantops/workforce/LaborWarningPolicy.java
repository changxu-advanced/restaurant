package com.advn.restaurantops.workforce;

import org.springframework.stereotype.Component;

@Component
public class LaborWarningPolicy {
    public Warning evaluate(int actualMinutes, int limitMinutes) {
        if (limitMinutes <= 0) throw new IllegalArgumentException("工時上限が設定されていません。");
        if (actualMinutes >= limitMinutes) return new Warning("ACTION", 100, "適用上限に到達または超過しています。");
        int percent = (int) Math.floor(actualMinutes * 100.0 / limitMinutes);
        if (percent >= 80) return new Warning("APPROACHING", percent, "適用上限の80%以上です。");
        return new Warning("NORMAL", percent, "適用上限の80%未満です。");
    }

    public record Warning(String level, int percent, String reason) {}
}

