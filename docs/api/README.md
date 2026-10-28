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

## Employee management

- `GET /api/v1/employees` supports `query`, `status`, `employmentType`, `roleTitle`, and `warning` filters.
- `GET /api/v1/employees/{id}` returns the employee profile, contract, skills, training progress, and availability slots.
- `POST /api/v1/employees` creates a manager-controlled employee record.
- `PATCH /api/v1/employees/{id}` updates the profile with optimistic `version` data.
- `POST /api/v1/employees/{id}/deactivate` preserves history while changing the employee status.
- `PUT /api/v1/employees/{id}/skills`, `PUT /api/v1/employees/{id}/training`, and `PUT /api/v1/employees/{id}/availability` replace the corresponding card data.
- `GET /api/v1/employees/{id}/labor-warning` returns the current hours, declared outside-work hours, limit, percentage, and warning reason.

Hourly wage, residence information, contact details, and notes are returned only to manager/admin roles. All employee queries are scoped by the tenant and store context.

