-- Sample data for CrewClock
-- Run after 001_initial_schema.sql

-- Sample projects (replace with your real projects)
INSERT INTO projects (project_num, name) VALUES
  ('24-001', 'Smith Residence'),
  ('24-002', 'Downtown Office Remodel'),
  ('24-003', 'Highway Bridge Repair'),
  ('26-000', 'Small Trucking Jobs');

-- Sample cost codes (replace with your real codes)
INSERT INTO cost_codes (code, description) VALUES
  ('03.1010', 'Concrete Foundations'),
  ('03.2010', 'Concrete Flatwork'),
  ('05.1010', 'Structural Steel'),
  ('06.1010', 'Rough Carpentry'),
  ('31.3105', 'Excavation'),
  ('32.1010', 'Grading'),
  ('33.1010', 'Utilities');

-- Sample equipment (for mechanic tracking)
INSERT INTO equipment (name, description) VALUES
  ('T-101', '2019 Ford F-350 Dump'),
  ('T-102', '2020 Kenworth T880'),
  ('T-103', '2021 CAT 320 Excavator'),
  ('T-104', '2018 John Deere 310SL Backhoe'),
  ('T-105', '2022 Peterbilt 567'),
  ('T-106', '2020 Volvo A30G Articulated Hauler');

-- NOTE: To create employee users, use Supabase Auth:
-- Employee IDs follow the format: AJK + LASTNAME (e.g. AJKSMITH for John Smith)
-- 1. Create auth user: supabase auth admin create-user --email "ajksmith@crew.local" --password "1234"
-- 2. Insert employee record:
--    INSERT INTO employees (emp_id, full_name, role, default_class)
--    VALUES ('AJKSMITH', 'John Smith', 'admin', 'MGMT');
