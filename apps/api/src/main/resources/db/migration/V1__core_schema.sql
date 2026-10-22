CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stores (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(120) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Tokyo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE employees (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  display_name VARCHAR(120) NOT NULL,
  employment_type VARCHAR(40) NOT NULL,
  role_title VARCHAR(80) NOT NULL,
  weekly_minutes INTEGER NOT NULL CHECK (weekly_minutes >= 0),
  weekly_limit_minutes INTEGER NOT NULL CHECK (weekly_limit_minutes > 0),
  skill_summary TEXT NOT NULL DEFAULT '',
  version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_employees_tenant_store ON employees(tenant_id, store_id);

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  name VARCHAR(120) NOT NULL,
  japanese_term VARCHAR(120) NOT NULL,
  stock_state VARCHAR(16) NOT NULL CHECK (stock_state IN ('ENOUGH', 'LOW', 'URGENT', 'OUT')),
  forecast_text VARCHAR(240) NOT NULL,
  recommendation_text VARCHAR(240),
  checked_at TIMESTAMPTZ,
  version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_inventory_tenant_store ON inventory_items(tenant_id, store_id);

CREATE TABLE handover_cards (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  category VARCHAR(40) NOT NULL,
  severity VARCHAR(16) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  summary VARCHAR(240) NOT NULL,
  status VARCHAR(16) NOT NULL CHECK (status IN ('OPEN', 'RESOLVED')),
  created_at TIMESTAMPTZ NOT NULL,
  version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_handovers_tenant_store ON handover_cards(tenant_id, store_id, created_at DESC);

CREATE TABLE scheduling_jobs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'INFEASIBLE', 'FAILED')),
  unmet_demand INTEGER NOT NULL DEFAULT 0,
  score_percent INTEGER,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  version BIGINT NOT NULL DEFAULT 0,
  CHECK (period_end >= period_start)
);

CREATE INDEX idx_scheduling_jobs_tenant_store ON scheduling_jobs(tenant_id, store_id, created_at DESC);

CREATE TABLE audit_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID REFERENCES stores(id),
  actor_id VARCHAR(160) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(80) NOT NULL,
  resource_id VARCHAR(100) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_audit_tenant_time ON audit_events(tenant_id, occurred_at DESC);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduling_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY employees_tenant_policy ON employees
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY inventory_tenant_policy ON inventory_items
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY handovers_tenant_policy ON handover_cards
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY scheduling_tenant_policy ON scheduling_jobs
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY audit_tenant_policy ON audit_events
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

COMMENT ON DATABASE restaurant_ops IS '飲食業オンライン管理システム';

