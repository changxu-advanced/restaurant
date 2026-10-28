export type NavKey = "today" | "schedule" | "inventory" | "chat" | "employees" | "closeout" | "settings" | "more" | "incidents" | "reservations" | "equipment" | "allergens" | "crossStore" | "evaluations";
export type StockState = "enough" | "low" | "urgent" | "out";
export type Availability = "desired" | "available" | "unavailable";

export interface Employee {
  id: string;
  name: string;
  initials: string;
  role: string;
  skills: string[];
  weeklyMinutes: number;
  weeklyLimitMinutes: number;
  warning: "normal" | "approaching" | "action";
}

export interface InventoryItem {
  id: string;
  name: string;
  japaneseTerm: string;
  state: StockState;
  forecast: string;
  recommendation?: string;
}

export interface Shift {
  id: string;
  employee: string;
  area: string;
  start: string;
  end: string;
  warning?: string;
}

