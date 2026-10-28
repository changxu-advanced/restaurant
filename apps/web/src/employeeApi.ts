import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as mockEmployees from "./employeeMock";

export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE";
export type EmployeeWarning = "NORMAL" | "APPROACHING" | "ACTION";
export type LaborMonitorBasis = "WEEKLY_LIMIT" | "MONTHLY_OVERTIME" | "PART_TIME_NO_IMMIGRATION_CAP";
export type LaborStandardPeriod = "WEEK" | "MONTH" | "CONTRACT_REFERENCE" | "NONE";
export type LaborLimitMode = "HARD" | "REFERENCE" | "NONE";
export type StudentWorkPeriod = "TERM" | "LONG_VACATION";

export interface EmployeeLaborMonitor {
  basis: LaborMonitorBasis;
  standardPeriod: LaborStandardPeriod;
  limitMode: LaborLimitMode;
  studentWorkPeriod?: StudentWorkPeriod;
  periodMinutes: number;
  standardMinutes: number;
  overtimeMinutes: number;
  overtimeLimitMinutes: number;
  hardLimitMinutes: number;
  remainingMinutes: number;
  agreementConfigured: boolean;
  scheduleBlocked: boolean;
  scheduleBlockReason?: string;
  warning: { level: EmployeeWarning; percent: number; reason: string };
}

export interface StoreSettings {
  storeId: string;
  prefecture: string;
  minimumWageYen?: number;
}

export interface EmployeeSummary {
  id: string;
  displayName: string;
  initials?: string;
  employmentType: string;
  roleTitle: string;
  experienceMonths?: number;
  skills: string[];
  weeklyMinutes: number;
  weeklyLimitMinutes: number;
  status: EmployeeStatus;
  outsideWorkMinutes: number;
  warning: { level: EmployeeWarning; percent: number; reason: string };
  monthlyMinutes?: number;
  studentWorkPeriod?: StudentWorkPeriod;
  laborMonitor: EmployeeLaborMonitor;
  version: number;
}

export interface EmployeeDetail {
  employee: EmployeeSummary;
  profile: {
    phone?: string;
    hourlyWageYen?: number;
    experienceMonths: number;
    commuteMinutes: number;
    traits: string;
    notes: string;
    outsideWorkMinutes: number;
    residenceStatus?: string;
    residenceExpiryDate?: string;
    laborRuleCode: string;
  };
  contract?: { contractType: string; startsOn: string; endsOn?: string; targetMinutes: number; limitMinutes: number; lateShiftAllowed: boolean };
  skills: Array<{ id: string; area: string; positionName: string; level: string; independent: boolean; canTrain: boolean }>;
  training?: Array<{ id: string; trainingKey: string; status: string }>;
  availability: Array<{ id: string; effectiveFrom: string; effectiveTo: string; weekday: number; slotStart: string; slotEnd: string; preference: string }>;
}

export interface EmployeeRequest {
  displayName: string;
  employmentType: string;
  roleTitle: string;
  hourlyWageYen?: number;
  experienceMonths: number;
  commuteMinutes: number;
  phone?: string;
  traits: string;
  notes: string;
  outsideWorkMinutes: number;
  residenceStatus?: string;
  residenceExpiryDate?: string;
  laborRuleCode: string;
  weeklyLimitMinutes: number;
  contractTargetMinutes?: number;
  contractLimitMinutes?: number;
  skills: string[];
}

export type EmployeeChangeRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export interface EmployeeChangeRequest {
  id: string;
  employeeId: string;
  submittedBy: "EMPLOYEE";
  status: EmployeeChangeRequestStatus;
  submittedAt: string;
  payload: Partial<EmployeeRequest>;
  reason?: string;
  reviewedAt?: string;
}

export type EmployeeFilters = { query?: string; status?: string; employmentType?: string; roleTitle?: string; warning?: string };

const dataSource = import.meta.env.VITE_EMPLOYEE_DATA_SOURCE ?? "mock";
const useMockData = dataSource !== "api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) }, ...options });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? "保存できませんでした。");
  return response.json() as Promise<T>;
}

export function useEmployees(filters: EmployeeFilters = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)) as Array<[string, string]>).toString();
  return useQuery({ queryKey: ["employees", filters], queryFn: () => useMockData ? mockEmployees.listEmployees(filters) : request<EmployeeSummary[]>(`/api/v1/employees${params ? `?${params}` : ""}`) });
}

export function useStoreSettings() {
  return useQuery({ queryKey: ["store-settings"], queryFn: () => useMockData ? mockEmployees.getStoreSettings() : request<StoreSettings>("/api/v1/settings/store") });
}

export function useEmployee(id: string | null) {
  return useQuery({ queryKey: ["employee", id], queryFn: () => useMockData ? mockEmployees.getEmployee(id!) : request<EmployeeDetail>(`/api/v1/employees/${id}`), enabled: Boolean(id) });
}

export function useCreateEmployee() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (payload: EmployeeRequest) => useMockData ? mockEmployees.createEmployee(payload) : request<EmployeeSummary>("/api/v1/employees", { method: "POST", body: JSON.stringify(payload) }), onSuccess: () => client.invalidateQueries({ queryKey: ["employees"] }) });
}

export function useUpdateEmployee(id: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (payload: EmployeeRequest) => useMockData ? mockEmployees.updateEmployee(id, payload) : request<EmployeeSummary>(`/api/v1/employees/${id}`, { method: "PATCH", body: JSON.stringify(payload) }), onSuccess: () => { void client.invalidateQueries({ queryKey: ["employees"] }); void client.invalidateQueries({ queryKey: ["employee", id] }); } });
}

export function useDeactivateEmployee(id: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: () => useMockData ? mockEmployees.deactivateEmployee(id) : request<EmployeeSummary>(`/api/v1/employees/${id}/deactivate`, { method: "POST" }), onSuccess: () => { void client.invalidateQueries({ queryKey: ["employees"] }); void client.invalidateQueries({ queryKey: ["employee", id] }); } });
}

export function useReactivateEmployee(id: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: () => useMockData ? mockEmployees.reactivateEmployee(id) : request<EmployeeSummary>(`/api/v1/employees/${id}/reactivate`, { method: "POST" }), onSuccess: () => { void client.invalidateQueries({ queryKey: ["employees"] }); void client.invalidateQueries({ queryKey: ["employee", id] }); } });
}

export function usePlaceEmployeeOnLeave(id: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: () => useMockData ? mockEmployees.placeEmployeeOnLeave(id) : request<EmployeeSummary>(`/api/v1/employees/${id}/leave`, { method: "POST" }), onSuccess: () => { void client.invalidateQueries({ queryKey: ["employees"] }); void client.invalidateQueries({ queryKey: ["employee", id] }); } });
}

export function useUpdateEmployeeSkills(id: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (skills: Array<{ area: string; positionName: string; level: string; independent: boolean; canTrain: boolean }>) => useMockData ? mockEmployees.updateEmployeeSkills(id, skills) : request(`/api/v1/employees/${id}/skills`, { method: "PUT", body: JSON.stringify({ skills }) }), onSuccess: () => void client.invalidateQueries({ queryKey: ["employee", id] }) });
}

export function useUpdateAvailability(id: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (slots: Array<{ effectiveFrom: string; effectiveTo: string; weekday: number; slotStart: string; slotEnd: string; preference: string }>) => useMockData ? mockEmployees.updateAvailability(id, slots) : request(`/api/v1/employees/${id}/availability`, { method: "PUT", body: JSON.stringify({ slots }) }), onSuccess: () => void client.invalidateQueries({ queryKey: ["employee", id] }) });
}

export function useEmployeeChangeRequests(id: string | null) {
  return useQuery({ queryKey: ["employee-change-requests", id], queryFn: () => useMockData ? mockEmployees.listEmployeeChangeRequests(id!) : request<EmployeeChangeRequest[]>(`/api/v1/employees/${id}/change-requests`), enabled: Boolean(id) });
}

export function useSubmitEmployeeChangeRequest(id: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (payload: Partial<EmployeeRequest>) => useMockData ? mockEmployees.submitEmployeeChangeRequest(id, payload) : request<EmployeeChangeRequest>(`/api/v1/employees/${id}/change-requests`, { method: "POST", body: JSON.stringify(payload) }), onSuccess: () => void client.invalidateQueries({ queryKey: ["employee-change-requests", id] }) });
}

export function useApproveEmployeeChangeRequest(id: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: (requestId: string) => useMockData ? mockEmployees.approveEmployeeChangeRequest(id, requestId) : request<EmployeeSummary>(`/api/v1/employees/${id}/change-requests/${requestId}/approve`, { method: "POST" }), onSuccess: () => { void client.invalidateQueries({ queryKey: ["employee-change-requests", id] }); void client.invalidateQueries({ queryKey: ["employees"] }); void client.invalidateQueries({ queryKey: ["employee", id] }); } });
}

export function useRejectEmployeeChangeRequest(id: string) {
  const client = useQueryClient();
  return useMutation({ mutationFn: ({ requestId, reason }: { requestId: string; reason?: string }) => useMockData ? mockEmployees.rejectEmployeeChangeRequest(id, requestId, reason) : request<EmployeeChangeRequest>(`/api/v1/employees/${id}/change-requests/${requestId}/reject`, { method: "POST", body: JSON.stringify({ reason }) }), onSuccess: () => void client.invalidateQueries({ queryKey: ["employee-change-requests", id] }) });
}
