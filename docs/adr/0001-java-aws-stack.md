# ADR 0001: Java / React / AWSを採用する

- Status: Accepted
- Date: 2026-10-22

## Context

日本でのJavaバックエンド／フルスタック転職を主目的とし、飲食店運営という具体的な業務課題を解決する作品集を作る。

## Decision

- APIはJava 21とSpring Bootを使用する。
- UIはReactとTypeScriptを使用する。
- DatabaseはPostgreSQLとFlywayを使用する。
- 最適化はPythonとOR-Toolsへ分離する。
- AWSはCDK TypeScriptで管理し、ECS、RDS、SQS、S3、CloudFront、Cognitoを使用する。
- 初期APIはモジュラーモノリスとし、最適化以外をマイクロサービス化しない。

## Consequences

企業開発で説明しやすい構成になる一方、公開デモには継続的なAWS費用が発生する。Demo stackはSingle-AZと短期保存で費用を抑え、Production referenceとの差を文書化する。

