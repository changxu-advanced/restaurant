import { beforeEach, describe, expect, it } from "vitest";
import { createEmployee, deactivateEmployee, getEmployee, listEmployees, placeEmployeeOnLeave, reactivateEmployee, studentWeeklyLimitMinutes, updateEmployee } from "./employeeMock";
import type { EmployeeRequest } from "./employeeApi";

const newEmployee: EmployeeRequest = {
  displayName: "テスト スタッフ",
  employmentType: "PART_TIME",
  roleTitle: "ホールサポート",
  hourlyWageYen: 1100,
  experienceMonths: 3,
  commuteMinutes: 20,
  phone: "090-0000-0000",
  traits: "丁寧",
  notes: "演示用",
  outsideWorkMinutes: 0,
  laborRuleCode: "PART_TIME",
  weeklyLimitMinutes: 2400,
  skills: ["配膳"]
};

describe("employee mock data source", () => {
  beforeEach(() => localStorage.clear());

  it("starts with boundary-focused fictional employees", async () => {
    const employees = await listEmployees();
    expect(employees).toHaveLength(36);
    expect(employees.some((employee) => employee.warning.level === "APPROACHING")).toBe(true);
    expect(employees.some((employee) => employee.warning.level === "NORMAL")).toBe(true);
    expect(employees.some((employee) => employee.warning.level === "ACTION")).toBe(true);
    expect(employees.some((employee) => employee.status === "ON_LEAVE")).toBe(true);
    expect(employees.some((employee) => employee.status === "INACTIVE")).toBe(true);
  });

  it("persists create and update operations in localStorage", async () => {
    const created = await createEmployee(newEmployee);
    expect(await listEmployees({ query: "テスト スタッフ" })).toHaveLength(1);
    await updateEmployee(created.id, { ...newEmployee, roleTitle: "夜間ホール" });
    expect((await getEmployee(created.id)).employee.roleTitle).toBe("夜間ホール");
    localStorage.removeItem("restaurant-ops.employee-mock.v3");
    expect(await listEmployees()).toHaveLength(36);
  });

  it("deactivates without deleting history", async () => {
    const employee = await deactivateEmployee("e5");
    expect(employee.status).toBe("INACTIVE");
    expect((await getEmployee("e5")).employee.displayName).toBe("Alex Chen");
    expect(await listEmployees({ status: "INACTIVE" })).toHaveLength(3);
  });

  it("reactivates a leave employee without deleting history", async () => {
    const employee = await reactivateEmployee("e13");
    expect(employee.status).toBe("ACTIVE");
    expect(employee.weeklyMinutes).toBe(0);
    expect((await getEmployee("e13")).employee.laborMonitor.scheduleBlocked).toBe(false);
  });

  it("places an active employee on leave without deleting contract data", async () => {
    const employee = await placeEmployeeOnLeave("e1");
    expect(employee.status).toBe("ON_LEAVE");
    expect((await getEmployee("e1")).contract?.targetMinutes).toBe(2400);
    expect((await getEmployee("e1")).employee.laborMonitor.periodMinutes).toBe(0);
  });

  it("persists separate contract target and limit values", async () => {
    const employee = await updateEmployee("e1", { ...newEmployee, displayName: "佐藤 美咲", employmentType: "FULL_TIME", roleTitle: "店長", weeklyLimitMinutes: 2400, contractTargetMinutes: 2400, contractLimitMinutes: 2700 });
    const detail = await getEmployee(employee.id);
    expect(detail.contract?.targetMinutes).toBe(2400);
    expect(detail.contract?.limitMinutes).toBe(2700);
    expect(detail.employee.laborMonitor.standardPeriod).toBe("MONTH");
  });

  it("keeps student workers on a strict combined weekly cap", async () => {
    expect(studentWeeklyLimitMinutes("TERM")).toBe(28 * 60);
    expect(studentWeeklyLimitMinutes("LONG_VACATION")).toBe(40 * 60);
    const withinLimit = await getEmployee("e3");
    expect(withinLimit.employee.laborMonitor.standardMinutes).toBe(28 * 60);
    expect(withinLimit.employee.laborMonitor.periodMinutes).toBe(27 * 60);
    expect(withinLimit.employee.laborMonitor.remainingMinutes).toBe(60);
    expect(withinLimit.employee.laborMonitor.scheduleBlocked).toBe(false);
    const blocked = await getEmployee("e12");
    expect(blocked.employee.laborMonitor.standardMinutes).toBe(28 * 60);
    expect(blocked.employee.laborMonitor.scheduleBlocked).toBe(true);
    expect(blocked.employee.laborMonitor.scheduleBlockReason).toContain("追加");
  });

  it("does not apply the student immigration cap to regular part-time staff", async () => {
    const regularPartTime = await getEmployee("e4");
    expect(regularPartTime.employee.laborMonitor.basis).toBe("PART_TIME_NO_IMMIGRATION_CAP");
    expect(regularPartTime.employee.laborMonitor.scheduleBlocked).toBe(false);
    expect(regularPartTime.employee.warning.level).toBe("NORMAL");
    expect(regularPartTime.employee.laborMonitor.standardMinutes).toBe(16 * 60);
    expect(regularPartTime.employee.warning.reason).not.toContain("28");
  });

  it("uses varied in-store contract references for regular part-time staff", async () => {
    const employees = await listEmployees();
    const regular = employees.filter((employee) => employee.employmentType === "PART_TIME");
    expect(regular.every((employee) => employee.laborMonitor.basis === "PART_TIME_NO_IMMIGRATION_CAP")).toBe(true);
    expect(regular.some((employee) => employee.weeklyLimitMinutes === 36 * 60 && employee.weeklyMinutes === 34 * 60)).toBe(true);
    expect(regular.every((employee) => employee.weeklyLimitMinutes !== 28 * 60)).toBe(true);
  });

  it("migrates the previous 28-hour demo record without overwriting custom fields", async () => {
    const previous = await getEmployee("e16");
    const stored = JSON.parse(localStorage.getItem("restaurant-ops.employee-mock.v3") ?? "[]") as typeof previous[];
    const item = stored.find((entry) => entry.employee.id === "e16");
    if (!item) throw new Error("missing fixture");
    item.employee.weeklyMinutes = 1680;
    item.employee.weeklyLimitMinutes = 1680;
    item.contract!.targetMinutes = 1680;
    item.contract!.limitMinutes = 1680;
    item.profile.traits = "用户自定义特征";
    localStorage.setItem("restaurant-ops.employee-mock.v3", JSON.stringify(stored));
    localStorage.removeItem("restaurant-ops.employee-mock.v3.boundary-v3");
    const migrated = await getEmployee("e16");
    expect(migrated.employee.weeklyMinutes).toBe(2040);
    expect(migrated.employee.weeklyLimitMinutes).toBe(2160);
    expect(migrated.contract?.targetMinutes).toBe(2160);
    expect(migrated.profile.traits).toBe("用户自定义特征");
  });
});
