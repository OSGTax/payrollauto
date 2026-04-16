export type Role = 'admin' | 'manager' | 'worker';

export type EntryStatus = 'draft' | 'submitted' | 'approved' | 'locked' | 'exported';

// ComputerEase type codes
export const TYPE_REGULAR = 1;
export const TYPE_OVERTIME = 2;
export const TYPE_DOUBLE = 3;
export const TYPE_SICK = 4;
export const TYPE_VACATION = 5;
export const TYPE_HOLIDAY = 6;

export const WORKTYPE_JOB = 1;
export const WORKTYPE_SHOP = 2;
export const WORKTYPE_TRAVEL = 3;

export type Employee = {
  id: string;
  auth_user_id: string | null;
  emp_code: string;
  first_name: string;
  last_name: string;
  role: Role;
  department: string | null;
  default_class: string | null;
  default_rate: number | null;
  default_wcomp1: string | null;
  default_wcomp2: string | null;
  manager_id: string | null;
  active: boolean;
};

export type Job = {
  job_code: string;
  description: string;
  state: string | null;
  local: string | null;
  default_worktype: number;
  active: boolean;
};

export type Phase = {
  job_code: string;
  phase_code: string;
  description: string;
  active: boolean;
};

export type Category = {
  job_code: string;
  phase_code: string;
  cat_code: string;
  description: string;
  active: boolean;
};

export type TimeEntry = {
  id: string;
  employee_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  hours: number;
  type: number;
  otmult: number | null;
  job: string | null;
  phase: string | null;
  cat: string | null;
  class: string | null;
  department: string | null;
  worktype: number | null;
  wcomp1: string | null;
  wcomp2: string | null;
  rate: number | null;
  notes: string | null;
  voice_text: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  status: EntryStatus;
  approved_by: string | null;
  approved_at: string | null;
  locked_at: string | null;
  exported_at: string | null;
  created_by: string | null;
  created_at: string;
  edited_by: string | null;
  edited_at: string | null;
};
