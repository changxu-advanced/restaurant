# ADR 0002: 店長端聊天資料來源

日期：2026-10-28

## 決策

店長端聊天頁面先以 `VITE_CHAT_DATA_SOURCE=mock` 使用瀏覽器 `localStorage` 展示完整流程，並以固定的 RESTful 路徑保留後端接入契約。切換為 `api` 時，頁面透過同一組 React Query hooks 讀取 `/api/v1/chat/...`，不改動畫面元件和互動。

## 範圍

- 群組訊息、缺員支援請求、設備或作業問題共用時間線。
- 店長可以發送訊息、建立支援請求、發布問題、解決或重新開啟問題。
- 店長不顯示支援回覆按鈕；店員回覆端保留 `support-requests/{id}/responses` 介面供後續開發。
- Mock 儲存鍵為 `restaurant-ops.chat-mock.v1`，重新整理後保留新增資料。

## REST 契約

```text
GET/POST /api/v1/chat/messages
GET/POST /api/v1/chat/support-requests
GET/POST /api/v1/chat/issues
PATCH    /api/v1/chat/issues/{issueId}/resolve
PATCH    /api/v1/chat/issues/{issueId}/reopen
GET/POST /api/v1/chat/support-requests/{requestId}/responses
```

此階段不改動後端、資料庫或角色權限模型；Mock 與 API 回傳相同的訊息、支援請求和問題資料結構。

