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
});

