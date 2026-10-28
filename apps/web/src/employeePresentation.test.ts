import { describe, expect, it } from "vitest";
import { employeeStatusLabel, roleTitleLabel, skillPositionLabel, trainingStatusLabel } from "./employeePresentation";

const t = (key: string) => ({
  statusActive: "Active",
  roleHall: "Front of house",
  skillRegister: "Register",
  trainingCompleted: "Completed",
  unknownStatus: "Not registered",
}[key] ?? key);

describe("employee presentation mappings", () => {
  it("translates database status and Japanese labels at the display boundary", () => {
    expect(employeeStatusLabel("ACTIVE", t)).toBe("Active");
    expect(roleTitleLabel("ホール", t)).toBe("Front of house");
    expect(skillPositionLabel("レジ", t)).toBe("Register");
    expect(trainingStatusLabel("COMPLETED", t)).toBe("Completed");
  });

  it("does not expose unknown system values", () => {
    expect(trainingStatusLabel("UNKNOWN_VALUE", t)).toBe("Not registered");
    expect(skillPositionLabel("未知の技能", t)).toBe("Not registered");
  });
});
