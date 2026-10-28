ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ON_LEAVE', 'INACTIVE')),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(40),
  ADD COLUMN IF NOT EXISTS hourly_wage_yen INTEGER CHECK (hourly_wage_yen IS NULL OR hourly_wage_yen >= 0),
  ADD COLUMN IF NOT EXISTS experience_months INTEGER NOT NULL DEFAULT 0 CHECK (experience_months >= 0),
  ADD COLUMN IF NOT EXISTS commute_minutes INTEGER NOT NULL DEFAULT 0 CHECK (commute_minutes >= 0),
  ADD COLUMN IF NOT EXISTS traits TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS outside_work_minutes INTEGER NOT NULL DEFAULT 0 CHECK (outside_work_minutes >= 0),
  ADD COLUMN IF NOT EXISTS residence_status VARCHAR(80),
  ADD COLUMN IF NOT EXISTS residence_expiry_date DATE,
  ADD COLUMN IF NOT EXISTS labor_rule_code VARCHAR(40) NOT NULL DEFAULT 'PART_TIME';

CREATE TABLE employee_contracts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  contract_type VARCHAR(40) NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE,
  target_minutes INTEGER NOT NULL CHECK (target_minutes >= 0),
  limit_minutes INTEGER NOT NULL CHECK (limit_minutes > 0),
  late_shift_allowed BOOLEAN NOT NULL DEFAULT false,
  version BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_employee_contracts_tenant_store ON employee_contracts(tenant_id, store_id, employee_id);
INSERT INTO employee_contracts(id, tenant_id, store_id, employee_id, contract_type, starts_on, target_minutes, limit_minutes, late_shift_allowed)
SELECT md5(e.id::text)::uuid, tenant_id, store_id, id, employment_type, CURRENT_DATE, weekly_minutes, weekly_limit_minutes, false
FROM employees e
WHERE NOT EXISTS (SELECT 1 FROM employee_contracts c WHERE c.employee_id = e.id);

CREATE TABLE employee_skills (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  area VARCHAR(24) NOT NULL CHECK (area IN ('FRONT', 'KITCHEN', 'CHEF')),
  position_name VARCHAR(80) NOT NULL,
  level VARCHAR(24) NOT NULL CHECK (level IN ('NOT_STARTED', 'LEARNING', 'ASSIST', 'INDEPENDENT', 'TRAINER')),
  independent BOOLEAN NOT NULL DEFAULT false,
  can_train BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (employee_id, area, position_name)
);
CREATE INDEX idx_employee_skills_tenant_store ON employee_skills(tenant_id, store_id, employee_id);

CREATE TABLE employee_training_progress (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  training_key VARCHAR(120) NOT NULL,
  status VARCHAR(24) NOT NULL CHECK (status IN ('NOT_STARTED', 'LEARNING', 'COMPLETED')),
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  UNIQUE (employee_id, training_key)
);
CREATE INDEX idx_employee_training_tenant_store ON employee_training_progress(tenant_id, store_id, employee_id);

CREATE TABLE employee_availability_preferences (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  effective_from DATE NOT NULL,
  effective_to DATE NOT NULL,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  slot_start TIME NOT NULL,
  slot_end TIME NOT NULL,
  preference VARCHAR(16) NOT NULL CHECK (preference IN ('DESIRED', 'AVAILABLE', 'UNAVAILABLE')),
  CHECK (slot_end > slot_start)
);
CREATE INDEX idx_employee_availability_tenant_store ON employee_availability_preferences(tenant_id, store_id, employee_id, effective_from);

ALTER TABLE employee_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_availability_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_contracts_tenant_policy ON employee_contracts
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY employee_skills_tenant_policy ON employee_skills
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY employee_training_tenant_policy ON employee_training_progress
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY employee_availability_tenant_policy ON employee_availability_preferences
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

ALTER POLICY employees_tenant_policy ON employees
  USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY employee_contracts_tenant_policy ON employee_contracts
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY employee_skills_tenant_policy ON employee_skills
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY employee_training_tenant_policy ON employee_training_progress
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
ALTER POLICY employee_availability_tenant_policy ON employee_availability_preferences
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
