# Changelog

## Unreleased

## 2026-10-28 员工管理阶段版本

- 新增员工管理列表、搜索、状态筛选、详情、编辑、自动保存和工时图表。
- 新增正社员、特定技能、普通兼职、留学生、休职和退职的差异化工时展示。
- 新增 36 名 Mock 员工边界数据，并覆盖留学生限制、加班、资料缺失和历史工时场景。
- 统一数据库日文岗位／技能值与六种语言前端显示层的转换，清理残留内部枚举和旧权限提示。
- 清理未使用的展示模块、格式化函数和重复翻译覆盖；功能与样式保持不变。
- 将员工状态、岗位、技能和培训的展示映射集中到独立模块，并删除未使用的出勤组件；不改变页面行为。
- 阶段详细说明见 `docs/stages/2026-10-28-employee-management.md`。

## 2026-10-28 従業員管理ステージ版

- 従業員一覧、検索、在籍状態フィルター、詳細、編集、自動保存、勤務時間グラフを追加。
- 正社員、特定技能、一般アルバイト、留学生アルバイト、休職、退職の勤務時間表示を分離。
- 留学生の週28時間・長期休暇40時間制限と兼業時間の合算、一般アルバイトの店舗契約参考時間を実装。
- 36名の境界条件Mockデータを追加し、残業、上限接近、上限超過、資料不足、休職、退職を確認可能にした。
- データ層の日本語職種・スキル値を、6言語のフロントエンド表示へ統一変換。
- 未使用コード、重複翻訳、旧権限案内を整理し、既存の機能とUIスタイルを維持。
- 詳細な段階記録は `docs/stages/2026-10-28-employee-management-ja.md` を参照。

- 员工管理从静态演示升级为API驱动的员工档案、筛选、详情、编辑和停用流程。
- 新增员工合同、技能、培训进度和固定时间段偏好的数据库结构及租户范围接口。
- 新增工时与兼业工时合计预警，并按店长权限保护时薪、联系方式和在留信息。
- 普通兼职改为显示店内合同参考工时，不再误用留学生每周28小时限制；旧演示数据会在浏览器刷新时自动迁移。
- 新增休职员工“复职”操作，恢复在职状态后重新参与工时与排班计算，并保留原有资料和时间段偏好。

## [0.2.0] - 2026-10-23

- Add exception-operation pages for guest care, reservations, equipment, allergens, cross-store support, and employee reviews.
- Add mobile-safe “More” entry with card-based navigation for the later-stage modules.
- Add PostgreSQL migration `V3__exception_operations.sql` with tenant-isolated tables and audit-ready statuses.

## [0.1.0] - Unreleased

### Added

- React/TypeScript operations dashboard with Japanese, Chinese, and English UI.
- Spring Boot modular API foundation and PostgreSQL migrations.
- Python OR-Tools scheduling service and asynchronous SQS worker contract.
- AWS CDK infrastructure for the public demo environment.
- Docker-based local development and CI verification.

