import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom/vitest";
import "./i18n";
import App from "./App";
import { getEmployee, listEmployees } from "./employeeMock";

describe("App", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });
  beforeEach(() => {
    window.location.hash = "#/today";
    localStorage.clear();
    window.scrollTo = vi.fn();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  });
  it("renders the operation board and product name", () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByText("飲食業オンライン管理システム")).toBeInTheDocument();
    expect(screen.getByText("対応が必要")).toBeInTheDocument();
  });

  it("renders the store date from the current Japan date", () => {
    vi.useFakeTimers({ now: new Date("2026-10-26T15:00:00.000Z") });
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByText("大阪中央店 · 2026.10.27")).toBeInTheDocument();
    expect(screen.queryByText("大阪中央店 · 2026.10.22")).not.toBeInTheDocument();
    expect(document.querySelector(".language-select")).toBeInTheDocument();
    expect(screen.getByDisplayValue("店長").closest(".language-select")).toBeInTheDocument();
    act(() => {
      vi.setSystemTime(new Date("2026-10-27T15:00:00.000Z"));
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText("大阪中央店 · 2026.10.28")).toBeInTheDocument();
  });

  it("keeps a compact back-to-top control available while scrolling", () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "トップへ戻る" })).not.toBeInTheDocument();
    Object.defineProperty(window, "scrollY", { configurable: true, value: window.innerHeight + 1 });
    fireEvent.scroll(window);
    const button = screen.getByRole("button", { name: "トップへ戻る" });
    expect(button).toHaveClass("back-to-top");
    expect(button).toHaveTextContent("トップへ戻る");
    expect(button.querySelector("svg")).toBeNull();
    fireEvent.click(button);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("navigates from a dashboard action to the related page", () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole("button", { name: /確認する/ })[1]);
    expect(screen.getByRole("heading", { name: "在庫" })).toBeInTheDocument();
    expect(window.location.hash).toBe("#/inventory");
  });

  it("shows a visible indicator when color assistance is enabled", () => {
    window.location.hash = "#/settings";
    render(<MemoryRouter><App /></MemoryRouter>);
    fireEvent.click(screen.getByRole("switch"));
    const indicator = screen.getByText("色覚サポート ON");
    expect(indicator).toBeInTheDocument();
    expect(indicator.closest(".app-shell")).toHaveClass("color-assist");
  });

  it("prevents copying displayed content", () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(fireEvent.copy(screen.getByRole("heading", { name: "飲食業オンライン管理システム" }))).toBe(false);
  });

  it("opens the second-version exception modules from More", () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole("button", { name: /その他/ })[0]);
    expect(screen.getByRole("heading", { name: "その他" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /確認する/ })[0]);
    expect(screen.getByRole("heading", { name: "接客・カスタマーハラスメント" })).toBeInTheDocument();
  });

  it("confirms an allergen handover without relying on color", () => {
    window.location.hash = "#/allergens";
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "アレルゲン・特別食" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "引き継ぎを確認" })[0]);
    expect(screen.getAllByRole("button", { name: "確認済み" })[0]).toBeInTheDocument();
  });

  it("fills the time range between two selected hourly blocks", () => {
    window.location.hash = "#/schedule";
    render(<MemoryRouter><App /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole("tab")[2]);
    const start = screen.getAllByRole("button", { name: "10/28 水 08:00–09:00" })[0];
    const end = screen.getAllByRole("button", { name: "10/28 水 12:00–13:00" })[0];
    fireEvent.click(start);
    fireEvent.click(end);
    expect(start).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("button", { name: "10/28 水 09:00–10:00" })[0]).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("button", { name: "10/28 水 11:00–12:00" })[0]).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getAllByRole("button", { name: "10/28 水 10:00–11:00" })[0]);
    expect(screen.getAllByRole("button", { name: "10/28 水 10:00–11:00" })[0]).toHaveAttribute("aria-pressed", "false");
  });

  it("cancels the selected time range between two points", () => {
    window.location.hash = "#/schedule";
    render(<MemoryRouter><App /></MemoryRouter>);
    const start = screen.getAllByRole("button", { name: "10/29 木 08:00–09:00" })[0];
    const end = screen.getAllByRole("button", { name: "10/29 木 12:00–13:00" })[0];
    const middle = screen.getAllByRole("button", { name: "10/29 木 10:00–11:00" })[0];
    fireEvent.click(start);
    expect(start).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(end);
    expect(end).toHaveAttribute("aria-pressed", "false");
    expect(middle).toHaveAttribute("aria-pressed", "false");
  });

  it("uses store defaults and removes the employee form placeholder", async () => {
    window.location.hash = "#/employees";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    await screen.findByRole("heading", { name: "スタッフ工時・在籍状態" });
    fireEvent.click(screen.getByRole("button", { name: /スタッフを追加/ }));
    await screen.findByRole("combobox", { name: "時給" });
    expect(screen.getByRole("combobox", { name: "時給" })).toHaveValue("1231");
    expect(screen.getByRole("combobox", { name: "通勤時間" })).toHaveValue("30");
    expect(screen.getByRole("combobox", { name: "在留資格" })).toHaveValue("なし");
    expect(screen.queryByText("選択してください")).not.toBeInTheDocument();
    const residenceOptions = Array.from((screen.getByRole("combobox", { name: "在留資格" }) as HTMLSelectElement).options).map((option) => option.textContent);
    expect(residenceOptions).not.toContain("自由入力");
  });

  it("auto-saves a custom wage on blur and can switch back to a preset", async () => {
    window.location.hash = "#/employees";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    await screen.findByRole("heading", { name: "スタッフ工時・在籍状態" });
    fireEvent.click((await screen.findAllByRole("button", { name: "編集" }))[0]);
    const wageSelect = await screen.findByRole("combobox", { name: "時給" });
    fireEvent.change(wageSelect, { target: { value: "__custom__" } });
    const customWage = await screen.findByRole("textbox", { name: "時給 自由入力" });
    fireEvent.change(customWage, { target: { value: "1375abc" } });
    fireEvent.blur(customWage);
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("restaurant-ops.employee-mock.v3") ?? "[]") as Array<{ employee: { id: string }; profile: { hourlyWageYen?: number } }>;
      expect(stored.find((item) => item.employee.id === "e1")?.profile.hourlyWageYen).toBe(1375);
    });
    expect(screen.queryByRole("textbox", { name: "時給 自由入力" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "1,375円" }));
    expect(screen.queryByRole("option", { name: "1,375円" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "1,231円" }));
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("restaurant-ops.employee-mock.v3") ?? "[]") as Array<{ employee: { id: string }; profile: { hourlyWageYen?: number } }>;
      expect(stored.find((item) => item.employee.id === "e1")?.profile.hourlyWageYen).toBe(1231);
    });
    expect(screen.queryByRole("textbox", { name: "時給 自由入力" })).not.toBeInTheDocument();
  });

  it("rejects quarter-hour other-work input", async () => {
    window.location.hash = "#/employees";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    await screen.findByRole("heading", { name: "スタッフ工時・在籍状態" });
    fireEvent.click((await screen.findAllByRole("button", { name: "編集" }))[0]);
    const outsideWorkSelect = await screen.findByRole("combobox", { name: "他の勤務先の申告" });
    fireEvent.change(outsideWorkSelect, { target: { value: "__custom__" } });
    const customOutsideWork = await screen.findByRole("textbox", { name: "他の勤務先の申告 自由入力" });
    fireEvent.change(customOutsideWork, { target: { value: "0.25" } });
    fireEvent.blur(customOutsideWork);
    expect(await screen.findByRole("alert")).toHaveTextContent("入力してください");
  });

  it("auto-saves ordinary employee fields and restores them when reopened", async () => {
    window.location.hash = "#/employees";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    await screen.findByRole("heading", { name: "スタッフ工時・在籍状態" });
    fireEvent.click((await screen.findAllByRole("button", { name: "編集" }))[0]);
    const phone = await screen.findByRole("textbox", { name: "電話" });
    fireEvent.change(phone, { target: { value: "09012345678" } });
    fireEvent.blur(phone);
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("restaurant-ops.employee-mock.v3") ?? "[]") as Array<{ employee: { id: string }; profile: { phone?: string } }>;
      expect(stored.find((item) => item.employee.id === "e1")?.profile.phone).toBe("09012345678");
    });
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    fireEvent.click((await screen.findAllByRole("button", { name: "編集" }))[0]);
    expect(await screen.findByRole("textbox", { name: "電話" })).toHaveValue("09012345678");
  });

  it("shows the selected employee's Monday-to-Sunday attendance summary", async () => {
    window.location.hash = "#/employees";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    await screen.findByRole("heading", { name: "スタッフ工時・在籍状態" });
    fireEvent.click(await screen.findByRole("button", { name: /佐々木 恒一/ }));
    expect(await screen.findByRole("heading", { name: "今週の出勤状況" })).toBeInTheDocument();
    const attendanceChart = screen.getByRole("img", { name: /今週の出勤状況/ });
    expect(attendanceChart).toBeInTheDocument();
    expect(attendanceChart.parentElement).toHaveClass("attendance-chart-shell");
    expect(attendanceChart.parentElement?.querySelector(".attendance-legend")).toBeInTheDocument();
    expect(attendanceChart.parentElement?.querySelector(".attendance-legend")?.textContent).toContain("通常勤務");
    expect(screen.getByText("月")).toBeInTheDocument();
    expect(screen.getByText("日")).toBeInTheDocument();
    expect(screen.getAllByText("月間標準").length).toBeGreaterThan(0);
    expect(screen.getAllByText("月45時間の時間外労働枠に接近しています")[0]).toBeInTheDocument();
    expect(screen.getAllByText("14:00–23:00").length).toBeGreaterThan(0);
  });

  it("shows student store hours separately from the strict combined cap", async () => {
    window.location.hash = "#/employees";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    await screen.findByRole("heading", { name: "スタッフ工時・在籍状態" });
    fireEvent.click(await screen.findByRole("button", { name: /王 小雨.*留学生/ }));
    expect(await screen.findByText("本店勤務時間")).toBeInTheDocument();
    expect(screen.getByText("25.0h")).toBeInTheDocument();
    expect(screen.getAllByText("合計時間（本店＋兼業）").length).toBeGreaterThan(0);
    expect(screen.getAllByText("27.0h").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1.0h").length).toBeGreaterThan(0);
  });

  it("shows ordinary part-time contract reference without a 28-hour cap", async () => {
    window.location.hash = "#/employees";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    await screen.findByRole("heading", { name: "スタッフ工時・在籍状態" });
    fireEvent.click(await screen.findByRole("button", { name: /森田 恒一/ }));
    expect((await screen.findAllByText("店内契約参考")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("36.0h").length).toBeGreaterThan(0);
    expect(screen.getAllByText("34.0h").length).toBeGreaterThan(0);
    expect(screen.queryByText("週上限")).not.toBeInTheDocument();
    expect(screen.queryByText(/28時間/)).not.toBeInTheDocument();
    expect(screen.getAllByText("一般アルバイト（留学生の工時硬上限対象外）").length).toBeGreaterThan(0);
  });

  it("lets a manager return a leave employee to active status", async () => {
    window.location.hash = "#/employees";
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    await screen.findByRole("heading", { name: "スタッフ工時・在籍状態" });
    fireEvent.click(await screen.findByRole("button", { name: /井上 恒一/ }));
    await screen.findByText("休職・現在の出勤なし");
    const reactivate = await screen.findByRole("button", { name: /復職/ });
    fireEvent.click(reactivate);
    await waitFor(() => expect(screen.getByRole("button", { name: "退職にする" })).toBeInTheDocument());
    expect(screen.getByText("在職")).toBeInTheDocument();
  });

  it("shows the complete employee information card", async () => {
    window.location.hash = "#/employees";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    await screen.findByRole("heading", { name: "スタッフ工時・在籍状態" });
    fireEvent.click(await screen.findByRole("button", { name: /伊藤 直子/ }));
    expect(await screen.findByText("雇用区分")).toBeInTheDocument();
    expect(screen.getByText("担当ポジション")).toBeInTheDocument();
    expect(screen.getByText("契約期間")).toBeInTheDocument();
    expect(screen.getByText("研修状況")).toBeInTheDocument();
    expect(screen.getByText("希望時間帯")).toBeInTheDocument();
    expect(screen.getAllByText("工時ステータス").length).toBeGreaterThan(0);
    expect(screen.getByText("ランチ帯に強い")).toBeInTheDocument();
  });

  it("closes employee details when the status filter changes", async () => {
    window.location.hash = "#/employees";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    await screen.findByRole("heading", { name: "スタッフ工時・在籍状態" });
    fireEvent.click(await screen.findByRole("button", { name: /佐々木 恒一/ }));
    expect(await screen.findByRole("heading", { name: "今週の出勤状況" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "在籍状態" }), { target: { value: "ON_LEAVE" } });
    await waitFor(() => expect(screen.queryByRole("heading", { name: "今週の出勤状況" })).not.toBeInTheDocument());
    expect(await screen.findByRole("button", { name: /井上 恒一/ })).toBeInTheDocument();
  });

  it("closes employee details when the search query changes", async () => {
    window.location.hash = "#/employees";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    await screen.findByRole("heading", { name: "スタッフ工時・在籍状態" });
    fireEvent.click(await screen.findByRole("button", { name: /佐々木 恒一/ }));
    expect(await screen.findByRole("heading", { name: "今週の出勤状況" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "スタッフを検索" }), { target: { value: "井上" } });
    await waitFor(() => expect(screen.queryByRole("heading", { name: "今週の出勤状況" })).not.toBeInTheDocument());
    expect(await screen.findByRole("button", { name: /井上 恒一/ })).toBeInTheDocument();
  });

  it("labels international students separately from regular part-time staff", async () => {
    window.location.hash = "#/employees";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    await screen.findByRole("heading", { name: "スタッフ工時・在籍状態" });
    const studentCard = await screen.findByRole("button", { name: /王 小雨.*留学生/ });
    expect(studentCard).toBeInTheDocument();
    expect(studentCard.querySelector(".hours-bar-normal")).toHaveStyle({ width: "89.28571428571429%" });
    expect(studentCard.querySelector(".hours-bar-extra")).toBeInTheDocument();
    const regularCard = screen.getByRole("button", { name: /鈴木 海/ });
    expect(regularCard).not.toHaveTextContent("留学生");
    expect(regularCard.querySelector(".hours-bar-normal")).toBeInTheDocument();
    const severeCard = screen.getByRole("button", { name: /中島 拓真/ });
    expect(severeCard.querySelector(".hours-bar-severe")).toBeInTheDocument();
    expect(severeCard.querySelector(".hours-bar-severe-fill")).toHaveStyle({ width: "100%" });
    expect(severeCard.querySelector(".hours-bar-normal")).toBeNull();
  });

  it("distinguishes leave and inactive employee progress bars", async () => {
    window.location.hash = "#/employees";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    await screen.findByRole("heading", { name: "スタッフ工時・在籍状態" });
    const leaveCard = await screen.findByRole("button", { name: /井上 恒一/ });
    expect(leaveCard).toHaveTextContent("休職");
    expect(leaveCard).toHaveTextContent("0.0h");
    expect(leaveCard.querySelector(".hours-bar-leave")).toBeInTheDocument();
    expect(leaveCard.querySelector(".hours-bar-normal")).toBeNull();
    const inactiveCard = screen.getByRole("button", { name: /小林 麻衣/ });
    expect(inactiveCard).toHaveTextContent("退職");
    expect(inactiveCard).toHaveTextContent("26.0h");
    expect(inactiveCard.querySelector(".hours-bar-inactive")).toBeInTheDocument();
    expect(inactiveCard.querySelector(".hours-bar-inactive-fill")).toBeNull();
    expect(inactiveCard.querySelector(".hours-bar-normal")).toBeNull();
  });

  it("seeds the full boundary employee set without exposing internal enum codes", async () => {
    const employees = await listEmployees();
    expect(employees).toHaveLength(36);
    expect(employees.map((employee) => employee.id)).toEqual(expect.arrayContaining(["e17", "e18", "e19", "e20", "e21", "e22", "e23", "e24", "e25", "e26", "e27", "e28", "e29", "e30", "e31", "e32", "e33", "e34", "e35", "e36"]));
    expect((await getEmployee("e34")).training).toEqual([]);
    expect((await getEmployee("e24")).employee.laborMonitor.scheduleBlocked).toBe(true);
    expect((await getEmployee("e30")).employee.laborMonitor.scheduleBlocked).toBe(false);

    window.location.hash = "#/employees";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    await screen.findByRole("heading", { name: "スタッフ工時・在籍状態" });
    fireEvent.click(await screen.findByRole("button", { name: /佐藤 美咲/ }));
    expect(screen.queryByText("COMPLETED")).not.toBeInTheDocument();
    expect(screen.queryByText("INDEPENDENT")).not.toBeInTheDocument();
    expect((await getEmployee("e5")).training?.[0]?.status).toBe("IN_PROGRESS");
  });

  it("localizes Japanese seed roles and skills in both Chinese interfaces", async () => {
    window.location.hash = "#/employees";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><App /></MemoryRouter></QueryClientProvider>);
    await screen.findByRole("heading", { name: "スタッフ工時・在籍状態" });
    const languageSelect = document.querySelector(".language-select select") as HTMLSelectElement;

    await act(async () => { fireEvent.change(languageSelect, { target: { value: "zh" } }); });
    expect(screen.queryByText("閉店清掃")).not.toBeInTheDocument();
    expect(screen.getAllByText("闭店清洁").length).toBeGreaterThan(0);
    expect(screen.queryByText("ホールリーダー")).not.toBeInTheDocument();

    await act(async () => { fireEvent.change(languageSelect, { target: { value: "zh-TW" } }); });
    expect(screen.queryByText("閉店清掃")).not.toBeInTheDocument();
    expect(screen.getAllByText("閉店清潔").length).toBeGreaterThan(0);
  });
});

