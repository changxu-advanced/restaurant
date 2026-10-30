export type NavKey = "today" | "schedule" | "inventory" | "chat" | "employees" | "closeout" | "settings" | "more" | "incidents" | "reservations" | "equipment" | "allergens" | "crossStore" | "evaluations";
export type StockState = "enough" | "low" | "urgent" | "out";
export type Availability = "desired" | "available" | "unavailable";

export interface Employee {
  id: string;
  name: string;
  initials?: string;
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
  /** Stable employee reference used when the mock is replaced by generated schedules. */
  employeeId?: string;
  employee: string;
  area: string;
  /** Stable position key for future API-backed schedules; `area` remains a legacy display fallback. */
  areaKey?: "hallManager" | "kitchenWok" | "hallRegister" | "kitchenDishwashing";
  /** ISO calendar date for the shift; omitted only for legacy demo rows. */
  date?: string;
  start: string;
  end: string;
  status?: "draft" | "published" | "confirmed";
  warning?: string;
}


