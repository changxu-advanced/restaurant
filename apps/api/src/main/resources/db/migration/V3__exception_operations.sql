CREATE TABLE customer_incidents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  category VARCHAR(40) NOT NULL CHECK (category IN ('COMPLAINT', 'HARASSMENT', 'ACCIDENT')),
  summary VARCHAR(240) NOT NULL,
  factual_notes TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN', 'MANAGER_REVIEW', 'RESOLVED')),
  reported_by VARCHAR(160) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE reservations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  reservation_at TIMESTAMPTZ NOT NULL,
  party_size INTEGER NOT NULL CHECK (party_size > 0),
  guest_label VARCHAR(120) NOT NULL,
  status VARCHAR(24) NOT NULL CHECK (status IN ('CONFIRMED', 'ARRIVED', 'CANCELLED', 'NO_SHOW')),
  cancellation_reason VARCHAR(240),
  version BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE equipment_maintenance (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  equipment_name VARCHAR(120) NOT NULL,
  issue_summary VARCHAR(240) NOT NULL,
  photo_key VARCHAR(240),
  assignee VARCHAR(160),
  status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'FIXED')),
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE allergen_confirmations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  service_at TIMESTAMPTZ NOT NULL,
  guest_label VARCHAR(120) NOT NULL,
  request_text VARCHAR(240) NOT NULL,
  confirmed_by VARCHAR(160),
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'CONFIRMED'))
);

CREATE TABLE cross_store_support_requests (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  source_store_id UUID NOT NULL REFERENCES stores(id),
  target_store_id UUID NOT NULL REFERENCES stores(id),
  position_name VARCHAR(120) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  response_deadline TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('OPEN', 'CONFIRMED', 'CLOSED')),
  CHECK (ends_at > starts_at)
);

CREATE TABLE employee_reviews (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  reviewer_id VARCHAR(160) NOT NULL,
  review_period DATE NOT NULL,
  skill_level VARCHAR(24) NOT NULL,
  factual_note TEXT NOT NULL,
  next_goal VARCHAR(240) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_tenant_store ON customer_incidents(tenant_id, store_id, occurred_at DESC);
CREATE INDEX idx_reservations_tenant_store ON reservations(tenant_id, store_id, reservation_at);
CREATE INDEX idx_equipment_tenant_store ON equipment_maintenance(tenant_id, store_id, updated_at DESC);
CREATE INDEX idx_allergens_tenant_store ON allergen_confirmations(tenant_id, store_id, service_at);
CREATE INDEX idx_support_tenant ON cross_store_support_requests(tenant_id, response_deadline);
CREATE INDEX idx_reviews_tenant_store ON employee_reviews(tenant_id, store_id, review_period DESC);

ALTER TABLE customer_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergen_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_store_support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_incidents_tenant_policy ON customer_incidents USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY reservations_tenant_policy ON reservations USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY equipment_tenant_policy ON equipment_maintenance USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY allergens_tenant_policy ON allergen_confirmations USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY support_tenant_policy ON cross_store_support_requests USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY reviews_tenant_policy ON employee_reviews USING (tenant_id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);
