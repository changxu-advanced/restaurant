CREATE TABLE employee_change_requests (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  payload_json TEXT NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  review_reason TEXT
);
CREATE INDEX idx_employee_change_requests_tenant_store ON employee_change_requests(tenant_id, store_id, employee_id, submitted_at DESC);
ALTER TABLE employee_change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY employee_change_requests_tenant_policy ON employee_change_requests USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid) WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
