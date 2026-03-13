-- CrewClock: Initial Schema
-- Run this in your Supabase SQL Editor

-- ═══════════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════════

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emp_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'field' CHECK (role IN ('field', 'admin')),
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

CREATE TABLE cost_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  project_id UUID REFERENCES projects(id),
  cost_code_id UUID REFERENCES cost_codes(id),
  is_shop BOOLEAN DEFAULT FALSE,
  shop_type TEXT CHECK (shop_type IN ('mechanic', 'trucking', 'misc_shop', 'office', 'small_engine')),
  worker_class TEXT NOT NULL DEFAULT 'LAB GEN',
  clock_in_lat DOUBLE PRECISION,
  clock_in_lng DOUBLE PRECISION,
  clock_in_accuracy DOUBLE PRECISION,
  equipment_id UUID REFERENCES equipment(id),
  notes TEXT,
  trucking_designation TEXT CHECK (trucking_designation IN ('shop', 'small', 'job')),
  trucking_job_code TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'flagged')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  local_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE entry_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  caption TEXT,
  taken_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
  reminder_time TEXT DEFAULT '06:00',
  enabled BOOLEAN DEFAULT TRUE
);

-- ═══════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════

CREATE INDEX idx_entries_employee ON time_entries(employee_id);
CREATE INDEX idx_entries_clock_in ON time_entries(clock_in);
CREATE INDEX idx_entries_status ON time_entries(status);
CREATE UNIQUE INDEX idx_entries_local_id ON time_entries(local_id) WHERE local_id IS NOT NULL;

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_photos ENABLE ROW LEVEL SECURITY;

-- Everyone can read reference tables
CREATE POLICY "Anyone can read employees" ON employees FOR SELECT USING (true);
CREATE POLICY "Anyone can read projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Anyone can read cost_codes" ON cost_codes FOR SELECT USING (true);
CREATE POLICY "Anyone can read equipment" ON equipment FOR SELECT USING (true);

-- Field workers can only see/create their own entries
CREATE POLICY "Workers see own entries" ON time_entries FOR SELECT USING (
  employee_id IN (
    SELECT e.id FROM employees e
    WHERE e.emp_id = (SELECT split_part(auth.email(), '@', 1))
  )
  OR
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.emp_id = (SELECT split_part(auth.email(), '@', 1))
    AND e.role = 'admin'
  )
);

CREATE POLICY "Workers create own entries" ON time_entries FOR INSERT WITH CHECK (
  employee_id IN (
    SELECT e.id FROM employees e
    WHERE e.emp_id = (SELECT split_part(auth.email(), '@', 1))
  )
);

CREATE POLICY "Workers update own entries" ON time_entries FOR UPDATE USING (
  employee_id IN (
    SELECT e.id FROM employees e
    WHERE e.emp_id = (SELECT split_part(auth.email(), '@', 1))
  )
  OR
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.emp_id = (SELECT split_part(auth.email(), '@', 1))
    AND e.role = 'admin'
  )
);

-- Photos follow time_entries access
CREATE POLICY "Photo access follows entry" ON entry_photos FOR SELECT USING (
  time_entry_id IN (SELECT id FROM time_entries)
);
CREATE POLICY "Workers add photos to own entries" ON entry_photos FOR INSERT WITH CHECK (
  time_entry_id IN (SELECT id FROM time_entries)
);

-- ═══════════════════════════════════════════
-- STORAGE BUCKET
-- ═══════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public) VALUES ('entry-photos', 'entry-photos', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated users upload photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'entry-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users read photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'entry-photos' AND auth.role() = 'authenticated');
