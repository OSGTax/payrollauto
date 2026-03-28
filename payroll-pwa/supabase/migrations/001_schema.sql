-- CrewClock v2: Complete Schema
-- Run this in your Supabase SQL Editor
-- WARNING: This drops all v1 tables. Run on a fresh project or after backing up data.

-- ═══════════════════════════════════════════
-- DROP OLD TABLES (if upgrading from v1)
-- ═══════════════════════════════════════════

DROP TABLE IF EXISTS notification_settings CASCADE;
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS entry_photos CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS cost_codes CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS employees CASCADE;

-- ═══════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════

CREATE TABLE worker_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('worker', 'manager', 'admin')),
  default_class TEXT DEFAULT 'LAB GEN',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_num TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  phase_code TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, phase_code)
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID REFERENCES phases(id) ON DELETE CASCADE NOT NULL,
  cat_code TEXT NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(phase_id, cat_code)
);

CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE trucking_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE plow_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('job', 'shop_mechanic', 'shop_office', 'trucking', 'plowing', 'break')),
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  -- Job fields
  project_id UUID REFERENCES projects(id),
  category_id UUID REFERENCES categories(id),
  -- Shop fields
  equipment_id UUID REFERENCES equipment(id),
  -- Trucking fields
  trucking_option_id UUID REFERENCES trucking_options(id),
  -- Plowing fields
  plow_location_id UUID REFERENCES plow_locations(id),
  -- Common fields
  worker_class_id UUID REFERENCES worker_classes(id),
  pay_type TEXT DEFAULT 'regular' CHECK (pay_type IN ('regular', 'overtime', 'sick', 'vacation', 'double_time')),
  hours NUMERIC,
  notes TEXT,
  -- GPS
  clock_in_lat DOUBLE PRECISION,
  clock_in_lng DOUBLE PRECISION,
  clock_out_lat DOUBLE PRECISION,
  clock_out_lng DOUBLE PRECISION,
  -- Review
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'flagged')),
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE time_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE NOT NULL,
  requested_by UUID REFERENCES employees(id) NOT NULL,
  message TEXT NOT NULL,
  requested_clock_in TIMESTAMPTZ,
  requested_clock_out TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,
  photo_type TEXT DEFAULT 'job_photo' CHECK (photo_type IN ('job_photo', 'receipt')),
  storage_path TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════

CREATE INDEX idx_entries_employee ON time_entries(employee_id);
CREATE INDEX idx_entries_clock_in ON time_entries(clock_in);
CREATE INDEX idx_entries_status ON time_entries(status);
CREATE INDEX idx_entries_activity ON time_entries(activity_type);
CREATE INDEX idx_phases_project ON phases(project_id);
CREATE INDEX idx_categories_phase ON categories(phase_id);
CREATE INDEX idx_change_requests_status ON time_change_requests(status);

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE trucking_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE plow_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's emp_id from auth email
CREATE OR REPLACE FUNCTION current_emp_id() RETURNS TEXT AS $$
  SELECT upper(split_part(auth.email(), '@', 1));
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
  SELECT role FROM employees WHERE emp_id = current_emp_id() AND is_active = true LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper function: get current user's employee id (UUID)
CREATE OR REPLACE FUNCTION current_employee_id() RETURNS UUID AS $$
  SELECT id FROM employees WHERE emp_id = current_emp_id() AND is_active = true LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ── Reference tables: everyone reads, admin writes ──

-- Employees
CREATE POLICY "Anyone reads employees" ON employees FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin inserts employees" ON employees FOR INSERT WITH CHECK (current_user_role() = 'admin');
CREATE POLICY "Admin updates employees" ON employees FOR UPDATE USING (current_user_role() = 'admin');

-- Worker classes
CREATE POLICY "Anyone reads worker_classes" ON worker_classes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manages worker_classes" ON worker_classes FOR INSERT WITH CHECK (current_user_role() = 'admin');
CREATE POLICY "Admin updates worker_classes" ON worker_classes FOR UPDATE USING (current_user_role() = 'admin');

-- Projects
CREATE POLICY "Anyone reads projects" ON projects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manages projects" ON projects FOR INSERT WITH CHECK (current_user_role() = 'admin');
CREATE POLICY "Admin updates projects" ON projects FOR UPDATE USING (current_user_role() = 'admin');

-- Phases
CREATE POLICY "Anyone reads phases" ON phases FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manages phases" ON phases FOR INSERT WITH CHECK (current_user_role() = 'admin');
CREATE POLICY "Admin updates phases" ON phases FOR UPDATE USING (current_user_role() = 'admin');

-- Categories
CREATE POLICY "Anyone reads categories" ON categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manages categories" ON categories FOR INSERT WITH CHECK (current_user_role() = 'admin');
CREATE POLICY "Admin updates categories" ON categories FOR UPDATE USING (current_user_role() = 'admin');

-- Equipment
CREATE POLICY "Anyone reads equipment" ON equipment FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manages equipment" ON equipment FOR INSERT WITH CHECK (current_user_role() = 'admin');
CREATE POLICY "Admin updates equipment" ON equipment FOR UPDATE USING (current_user_role() = 'admin');

-- Trucking options
CREATE POLICY "Anyone reads trucking_options" ON trucking_options FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manages trucking_options" ON trucking_options FOR INSERT WITH CHECK (current_user_role() = 'admin');
CREATE POLICY "Admin updates trucking_options" ON trucking_options FOR UPDATE USING (current_user_role() = 'admin');

-- Plow locations
CREATE POLICY "Anyone reads plow_locations" ON plow_locations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manages plow_locations" ON plow_locations FOR INSERT WITH CHECK (current_user_role() = 'admin');
CREATE POLICY "Admin updates plow_locations" ON plow_locations FOR UPDATE USING (current_user_role() = 'admin');

-- App settings
CREATE POLICY "Anyone reads app_settings" ON app_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manages app_settings" ON app_settings FOR INSERT WITH CHECK (current_user_role() = 'admin');
CREATE POLICY "Admin updates app_settings" ON app_settings FOR UPDATE USING (current_user_role() = 'admin');

-- ── Time entries: workers own, managers/admin see all ──

CREATE POLICY "Workers see own entries" ON time_entries FOR SELECT USING (
  employee_id = current_employee_id()
  OR current_user_role() IN ('manager', 'admin')
);

CREATE POLICY "Workers create own entries" ON time_entries FOR INSERT WITH CHECK (
  employee_id = current_employee_id()
);

CREATE POLICY "Workers update own current-week entries" ON time_entries FOR UPDATE USING (
  (employee_id = current_employee_id() AND clock_in >= date_trunc('week', now()))
  OR current_user_role() IN ('manager', 'admin')
);

-- ── Time change requests ──

CREATE POLICY "Workers see own requests" ON time_change_requests FOR SELECT USING (
  requested_by = current_employee_id()
  OR current_user_role() IN ('manager', 'admin')
);

CREATE POLICY "Workers create own requests" ON time_change_requests FOR INSERT WITH CHECK (
  requested_by = current_employee_id()
);

CREATE POLICY "Managers review requests" ON time_change_requests FOR UPDATE USING (
  current_user_role() IN ('manager', 'admin')
);

-- ── Photos ──

CREATE POLICY "Workers see own photos" ON photos FOR SELECT USING (
  employee_id = current_employee_id()
  OR current_user_role() IN ('manager', 'admin')
);

CREATE POLICY "Workers upload own photos" ON photos FOR INSERT WITH CHECK (
  employee_id = current_employee_id()
);

-- ═══════════════════════════════════════════
-- STORAGE BUCKET
-- ═══════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated upload photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated read photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- ═══════════════════════════════════════════
-- SEED: Default data
-- ═══════════════════════════════════════════

-- Worker classes
INSERT INTO worker_classes (name) VALUES
  ('LAB GEN'), ('OPER A'), ('FOREMAN'), ('MECHANIC'), ('CARP'),
  ('DRIVER'), ('MGMT'), ('LAB GENB'), ('MASON'), ('IRONWRKR');

-- App settings
INSERT INTO app_settings (key, value) VALUES
  ('plowing_enabled', 'false');

-- NOTE: To set up the admin account after running this migration:
-- 1. Create auth user in Supabase Dashboard > Authentication > Users > Add User
--    Email: ajkgottfried@crew.local  |  Password: (your choice)
-- 2. Then run:
--    INSERT INTO employees (emp_id, full_name, role, default_class)
--    VALUES ('AJKGOTTFRIED', 'Gottfried', 'admin', 'MGMT');
