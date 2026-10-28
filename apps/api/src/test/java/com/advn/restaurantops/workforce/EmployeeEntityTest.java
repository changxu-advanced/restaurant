package com.advn.restaurantops.workforce;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class EmployeeEntityTest {
    @Test
    void updatesProfileAndDeactivatesWithoutDeletingTheEmployee() {
        var employee = new EmployeeEntity(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), "佐藤", "PART_TIME", "ホール", 1200, 1680, "レジ");
        employee.update("佐藤 美咲", "PART_TIME", "ホール責任者", 1200, 18, 35, "090-0000-0000", "新人指導が得意", "週末希望", 120, null, null, "PART_TIME", 1680);
        assertEquals("佐藤 美咲", employee.getDisplayName());
        assertEquals(120, employee.getOutsideWorkMinutes());
        employee.deactivate();
        assertEquals("INACTIVE", employee.getStatus());
    }

    @Test
    void rejectsNegativeProfileNumbers() {
        var employee = new EmployeeEntity(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), "佐藤", "PART_TIME", "ホール", 1200, 1680, "レジ");
        assertThrows(IllegalArgumentException.class, () -> employee.update("佐藤", "PART_TIME", "ホール", -1, 0, 0, null, "", "", 0, null, null, "PART_TIME", 1680));
    }
}
