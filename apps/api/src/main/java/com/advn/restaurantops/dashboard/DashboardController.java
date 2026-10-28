package com.advn.restaurantops.dashboard;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {
    @GetMapping
    DashboardView today() {
        return new DashboardView("OPEN", OffsetDateTime.now(ZoneId.of("Asia/Tokyo")), 3, List.of(
                new ExceptionCard("POSITION_SHORTAGE", "ACTION", "18:00–20:30 鍋場が1名不足", "12:00", "SUPPORT_REQUEST"),
                new ExceptionCard("STOCK_FORECAST", "WARNING", "キャベツが18:40頃に欠品見込み", "13:00", "PROCUREMENT_DRAFT"),
                new ExceptionCard("HANDOVER", "WARNING", "冷蔵庫2番の温度確認", "閉店前", "HANDOVER_CONFIRM")));
    }

    record DashboardView(String businessPhase, OffsetDateTime generatedAt, int attentionCount, List<ExceptionCard> exceptions) {}
    record ExceptionCard(String type, String severity, String summary, String deadline, String nextAction) {}
}

