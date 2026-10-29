export type ChatMessage = {
  id: string;
  kind: "message";
  messageType?: "NOTICE";
  author: string;
  initials: string;
  body: string;
  attachments?: ChatAttachment[];
  createdAt: string;
};

export type ChatAttachment = {
  id: string;
  name: string;
  type: string;
  url: string;
};

export type SupportResponse = { kind: "yes" | "partial" | "no"; author: string };

export type ChatSupportRequest = {
  id: string;
  kind: "support";
  author: string;
  createdAt: string;
  shiftDate: string;
  shiftTime: string;
  position: string;
  note: string;
  replyDeadline: string;
  responses: SupportResponse[];
};

export type ChatIssue = {
  id: string;
  kind: "issue";
  author: string;
  createdAt: string;
  title: string;
  body: string;
  area?: string;
  status: "OPEN" | "RESOLVED";
  resolvedBy?: string;
  resolvedAt?: string;
};

export type ChatItem = ChatMessage | ChatSupportRequest | ChatIssue;

export type ChatState = { items: ChatItem[] };

export type CreateMessageInput = { author: string; initials: string; body: string; messageType?: "NOTICE"; attachments?: ChatAttachment[] };
export type CreateSupportInput = Omit<ChatSupportRequest, "id" | "kind" | "createdAt" | "responses">;
export type CreateIssueInput = Omit<ChatIssue, "id" | "kind" | "createdAt" | "status" | "resolvedBy" | "resolvedAt">;

export const CHAT_STORAGE_KEY = "restaurant-ops.chat-mock.v1";

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const seed: ChatState = {
  items: [
    { id: "message-fridge", kind: "message", author: "山田", initials: "山", body: "冷蔵庫2番の扉が少し閉まりにくくなっています。", createdAt: "2026-10-22T10:25:00+09:00" },
    { id: "support-seed", kind: "support", author: "店長", createdAt: "2026-10-22T10:30:00+09:00", shiftDate: "本日", shiftTime: "18:00–20:30", position: "鍋場", note: "欠勤連絡がありました。条件に合うスタッフに確認してください。", replyDeadline: "12:00", responses: [] },
    { id: "issue-fridge", kind: "issue", author: "店長", createdAt: "2026-10-22T10:32:00+09:00", title: "冷蔵庫2番の扉が閉まりにくい", body: "閉店時に庫内温度と扉を再確認してください。", area: "設備 · 冷蔵庫2番", status: "OPEN" }
  ]
};

function read(): ChatState {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return write({ items: seed.items.map((item) => ({ ...item })) });
    const parsed = JSON.parse(raw) as ChatState;
    return Array.isArray(parsed.items) ? parsed : write({ items: seed.items.map((item) => ({ ...item })) });
  } catch {
    return write({ items: seed.items.map((item) => ({ ...item })) });
  }
}

function write(state: ChatState): ChatState {
  window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state));
  return state;
}

export async function listChatItems(): Promise<ChatItem[]> {
  return read().items;
}

export async function listSupportResponses(requestId: string): Promise<SupportResponse[]> {
  const request = read().items.find((item): item is ChatSupportRequest => item.kind === "support" && item.id === requestId);
  return request?.responses ?? [];
}

export async function createSupportResponse(requestId: string, response: SupportResponse): Promise<SupportResponse> {
  const state = read();
  let created: SupportResponse | undefined;
  const items = state.items.map((item) => {
    if (item.kind !== "support" || item.id !== requestId) return item;
    created = response;
    const responses = [...item.responses.filter((entry) => entry.author !== response.author), response];
    return { ...item, responses };
  });
  if (!created) throw new Error("支援请求不存在");
  write({ items });
  return created;
}

export async function createChatMessage(input: CreateMessageInput): Promise<ChatMessage> {
  const item: ChatMessage = { ...input, id: id("message"), kind: "message", createdAt: now() };
  write({ items: [...read().items, item] });
  return item;
}

export async function createSupportRequest(input: CreateSupportInput): Promise<ChatSupportRequest> {
  const item: ChatSupportRequest = { ...input, id: id("support"), kind: "support", createdAt: now(), responses: [] };
  write({ items: [...read().items, item] });
  return item;
}

export async function createChatIssue(input: CreateIssueInput): Promise<ChatIssue> {
  const item: ChatIssue = { ...input, id: id("issue"), kind: "issue", createdAt: now(), status: "OPEN" };
  write({ items: [...read().items, item] });
  return item;
}

export async function resolveChatIssue(issueId: string, resolvedBy: string): Promise<ChatIssue> {
  const resolvedAt = now();
  const state = read();
  let updated: ChatIssue | undefined;
  const items = state.items.map((item) => {
    if (item.kind !== "issue" || item.id !== issueId) return item;
    updated = { ...item, status: "RESOLVED", resolvedBy, resolvedAt };
    return updated;
  });
  write({ items });
  if (!updated) throw new Error("问题不存在");
  return updated;
}

export async function reopenChatIssue(issueId: string): Promise<ChatIssue> {
  const state = read();
  let updated: ChatIssue | undefined;
  const items = state.items.map((item) => {
    if (item.kind !== "issue" || item.id !== issueId) return item;
    updated = { ...item, status: "OPEN", resolvedBy: undefined, resolvedAt: undefined };
    return updated;
  });
  write({ items });
  if (!updated) throw new Error("问题不存在");
  return updated;
}

