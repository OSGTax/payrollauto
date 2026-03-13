-- Allow admins to insert/update/delete reference data tables
-- Run this in your Supabase SQL Editor

-- Employees: admins can insert and update
CREATE POLICY "Admins can insert employees" ON employees FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.emp_id = (SELECT split_part(auth.email(), '@', 1))
    AND e.role = 'admin'
  )
);

CREATE POLICY "Admins can update employees" ON employees FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.emp_id = (SELECT split_part(auth.email(), '@', 1))
    AND e.role = 'admin'
  )
);

-- Projects: admins can insert and update
CREATE POLICY "Admins can insert projects" ON projects FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.emp_id = (SELECT split_part(auth.email(), '@', 1))
    AND e.role = 'admin'
  )
);

CREATE POLICY "Admins can update projects" ON projects FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.emp_id = (SELECT split_part(auth.email(), '@', 1))
    AND e.role = 'admin'
  )
);

-- Cost codes: admins can insert and update
CREATE POLICY "Admins can insert cost_codes" ON cost_codes FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.emp_id = (SELECT split_part(auth.email(), '@', 1))
    AND e.role = 'admin'
  )
);

CREATE POLICY "Admins can update cost_codes" ON cost_codes FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.emp_id = (SELECT split_part(auth.email(), '@', 1))
    AND e.role = 'admin'
  )
);

-- Equipment: admins can insert and update
CREATE POLICY "Admins can insert equipment" ON equipment FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.emp_id = (SELECT split_part(auth.email(), '@', 1))
    AND e.role = 'admin'
  )
);

CREATE POLICY "Admins can update equipment" ON equipment FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM employees e
    WHERE e.emp_id = (SELECT split_part(auth.email(), '@', 1))
    AND e.role = 'admin'
  )
);
