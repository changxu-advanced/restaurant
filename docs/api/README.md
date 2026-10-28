# API conventions

- Base path: `/api/v1`
- JSON: `camelCase`
- Date/time: ISO 8601 with timezone
- Business timezone: `Asia/Tokyo`
- Money: integer JPY
- Work duration: integer minutes
- Authentication: Cognito JWT Bearer token
- Write idempotency: `Idempotency-Key`
- Concurrency: optimistic `version`

標準エラー:

```json
{
  "code": "BUSINESS_RULE_VIOLATION",
  "message": "終了日は開始日以降にしてください。",
  "fieldErrors": {},
  "recoveryAction": "条件を確認してから再試行してください。",
  "traceId": "..."
}
```

開発環境ではSpringdocの `/docs` と `/v3/api-docs` を使用する。

