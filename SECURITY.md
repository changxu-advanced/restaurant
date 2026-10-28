# Security Policy

## Reporting

脆弱性は公開Issueへ詳細を書かず、リポジトリ所有者へ非公開で連絡してください。

## Data policy

- 公開デモでは合成データだけを使用します。
- 秘密情報、実在する従業員情報、売上情報をコミットしません。
- AWSへのデプロイはGitHub Actions OIDCを使用し、長期Access Keyを保存しません。
- `tenant_id` と `store_id` はサーバー側の認証コンテキストから決定します。
- 給与、在留資格、個人情報は役割別に表示を制限します。

