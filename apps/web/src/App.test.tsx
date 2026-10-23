import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import "./i18n";
import App from "./App";

describe("App", () => {
  afterEach(cleanup);
  beforeEach(() => {
    window.location.hash = "#/today";
    localStorage.clear();
    window.scrollTo = vi.fn();
  });
  it("renders the operation board and product name", () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByText("飲食業オンライン管理システム")).toBeInTheDocument();
    expect(screen.getByText("対応が必要")).toBeInTheDocument();
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
    expect(screen.getByRole("heading", { name: "接客与カスタマーハラスメント" })).toBeInTheDocument();
  });

  it("confirms an allergen handover without relying on color", () => {
    window.location.hash = "#/allergens";
    render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: "过敏原与特殊饮食" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "确认交接" })[0]);
    expect(screen.getAllByRole("button", { name: "已确认" })[0]).toBeInTheDocument();
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
});

