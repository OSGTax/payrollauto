-- Add 'other' to trucking_designation for "Trucking for Others" entries
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_trucking_designation_check;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_trucking_designation_check
  CHECK (trucking_designation IN ('shop', 'small', 'job', 'other'));
