import { supabase } from './supabase';
import type { Employee, Project, CostCode, Equipment, TimeEntry } from './types';

// ── Employees ──
export async function getEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('is_active', true)
    .order('full_name');
  if (error) throw error;
  return data as Employee[];
}

export async function getEmployeeByEmpId(empId: string) {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('emp_id', empId)
    .single();
  if (error) throw error;
  return data as Employee;
}

// ── Projects ──
export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('is_active', true)
    .order('project_num');
  if (error) throw error;
  return data as Project[];
}

// ── Cost Codes ──
export async function getCostCodes() {
  const { data, error } = await supabase
    .from('cost_codes')
    .select('*')
    .eq('is_active', true)
    .order('code');
  if (error) throw error;
  return data as CostCode[];
}

// ── Equipment ──
export async function getEquipment() {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data as Equipment[];
}

// ── Time Entries ──
export async function clockIn(entry: Omit<TimeEntry, 'id' | 'created_at' | 'updated_at' | 'clock_out' | 'status' | 'admin_notes' | 'reviewed_by' | 'reviewed_at'>) {
  const { data, error } = await supabase
    .from('time_entries')
    .insert({ ...entry, status: 'pending' })
    .select()
    .single();
  if (error) throw error;
  return data as TimeEntry;
}

export async function clockOut(entryId: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .update({ clock_out: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', entryId)
    .select()
    .single();
  if (error) throw error;
  return data as TimeEntry;
}

export async function getActiveEntry(employeeId: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('employee_id', employeeId)
    .is('clock_out', null)
    .order('clock_in', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as TimeEntry | null;
}

export async function getEntriesForWeek(employeeId: string, weekStart: string, weekEnd: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('employee_id', employeeId)
    .gte('clock_in', weekStart)
    .lte('clock_in', weekEnd)
    .order('clock_in');
  if (error) throw error;
  return data as TimeEntry[];
}

export async function getAllEntriesForDateRange(start: string, end: string) {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*, employees(emp_id, full_name), projects(project_num, name), cost_codes(code, description), equipment(name, description)')
    .gte('clock_in', start)
    .lte('clock_in', end)
    .order('clock_in');
  if (error) throw error;
  return data;
}

export async function updateEntryStatus(entryId: string, status: 'approved' | 'flagged', reviewerId: string, notes?: string) {
  const { error } = await supabase
    .from('time_entries')
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      admin_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId);
  if (error) throw error;
}

export async function batchUpdateStatus(
  entryIds: string[],
  status: 'approved' | 'flagged',
  reviewerId: string,
  notes?: string
) {
  const { error } = await supabase
    .from('time_entries')
    .update({
      status,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      admin_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .in('id', entryIds);
  if (error) throw error;
}

export async function updateEntryTimes(
  entryId: string,
  clockIn: string,
  clockOut: string | null,
  reviewerId: string
) {
  const { error } = await supabase
    .from('time_entries')
    .update({
      clock_in: clockIn,
      clock_out: clockOut,
      reviewed_by: reviewerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entryId);
  if (error) throw error;
}

// ── Photos ──
export async function uploadPhoto(entryId: string, file: File) {
  const path = `entries/${entryId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('entry-photos')
    .upload(path, file);
  if (uploadError) throw uploadError;

  const { error: dbError } = await supabase
    .from('entry_photos')
    .insert({ time_entry_id: entryId, storage_path: path });
  if (dbError) throw dbError;

  return path;
}

export async function getPhotosForEntry(entryId: string) {
  const { data, error } = await supabase
    .from('entry_photos')
    .select('*')
    .eq('time_entry_id', entryId);
  if (error) throw error;
  return data;
}
