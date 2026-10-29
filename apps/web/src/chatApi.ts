import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as mock from "./chatMock";
import type { ChatIssue, ChatItem, ChatMessage, ChatSupportRequest, CreateIssueInput, CreateMessageInput, CreateSupportInput, SupportResponse } from "./chatMock";

export type { ChatAttachment, ChatIssue, ChatItem, ChatMessage, ChatSupportRequest, CreateIssueInput, CreateMessageInput, CreateSupportInput, SupportResponse } from "./chatMock";

const dataSource = import.meta.env.VITE_CHAT_DATA_SOURCE ?? "mock";
const useMockData = dataSource !== "api";
const chatQueryKey = ["chat-items"];

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) }, ...options });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? "聊天操作失败，请稍后重试。");
  return response.json() as Promise<T>;
}

async function listItemsFromApi(): Promise<ChatItem[]> {
  const [messages, supportRequests, issues] = await Promise.all([
    request<ChatMessage[]>("/api/v1/chat/messages"),
    request<ChatSupportRequest[]>("/api/v1/chat/support-requests"),
    request<ChatIssue[]>("/api/v1/chat/issues")
  ]);
  return [...messages, ...supportRequests, ...issues].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function useChatItems() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: chatQueryKey,
    queryFn: () => useMockData ? mock.listChatItems() : listItemsFromApi()
  });
  useEffect(() => {
    if (!useMockData) return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === mock.CHAT_STORAGE_KEY) {
        void client.invalidateQueries({ queryKey: chatQueryKey });
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [client]);
  return query;
}

function invalidate(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: chatQueryKey });
}

export function useCreateChatMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMessageInput) => useMockData ? mock.createChatMessage(payload) : request<ChatMessage>("/api/v1/chat/messages", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => invalidate(client)
  });
}

export function useCreateSupportRequest() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSupportInput) => useMockData ? mock.createSupportRequest(payload) : request<ChatSupportRequest>("/api/v1/chat/support-requests", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => invalidate(client)
  });
}

export function useCreateSupportResponse() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, response }: { requestId: string; response: SupportResponse }) => useMockData ? mock.createSupportResponse(requestId, response) : request<SupportResponse>(`/api/v1/chat/support-requests/${requestId}/responses`, { method: "POST", body: JSON.stringify(response) }),
    onSuccess: () => invalidate(client)
  });
}

export function useCreateChatIssue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateIssueInput) => useMockData ? mock.createChatIssue(payload) : request<ChatIssue>("/api/v1/chat/issues", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => invalidate(client)
  });
}

export function useResolveChatIssue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ issueId, resolvedBy }: { issueId: string; resolvedBy: string }) => useMockData ? mock.resolveChatIssue(issueId, resolvedBy) : request<ChatIssue>(`/api/v1/chat/issues/${issueId}/resolve`, { method: "PATCH", body: JSON.stringify({ resolvedBy }) }),
    onSuccess: () => invalidate(client)
  });
}

export function useReopenChatIssue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (issueId: string) => useMockData ? mock.reopenChatIssue(issueId) : request<ChatIssue>(`/api/v1/chat/issues/${issueId}/reopen`, { method: "PATCH" }),
    onSuccess: () => invalidate(client)
  });
}

/** Reserved for the staff-facing response UI. */
export async function listSupportResponses(requestId: string): Promise<SupportResponse[]> {
  return useMockData ? mock.listSupportResponses(requestId) : request<SupportResponse[]>(`/api/v1/chat/support-requests/${requestId}/responses`);
}

/** Reserved for the staff-facing response UI. */
export async function createSupportResponse(requestId: string, response: SupportResponse): Promise<SupportResponse> {
  return useMockData ? mock.createSupportResponse(requestId, response) : request<SupportResponse>(`/api/v1/chat/support-requests/${requestId}/responses`, { method: "POST", body: JSON.stringify(response) });
}

