export interface Employee {
  id: string;
  emp_id: string;
  full_name: string;
  role: 'field' | 'admin';
  default_class: string;
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  project_num: string;
  name: string;
  is_active: boolean;
}

export interface CostCode {
  id: string;
  code: string;
  description: string;
  is_active: boolean;
}

export interface Equipment {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
}

export interface TimeEntry {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  project_id: string | null;
  cost_code_id: string | null;
  is_shop: boolean;
  shop_type: 'mechanic' | 'trucking' | 'misc_shop' | 'office' | 'small_engine' | null;
  worker_class: string;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_in_accuracy: number | null;
  equipment_id: string | null;
  notes: string | null;
  trucking_designation: 'shop' | 'small' | 'job' | null;
  trucking_job_code: string | null;
  status: 'pending' | 'approved' | 'flagged';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  local_id: string;
  created_at: string;
  updated_at: string;
}

export interface EntryPhoto {
  id: string;
  time_entry_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  caption: string | null;
  taken_at: string;
}

export interface PushSubscription {
  id: string;
  employee_id: string;
  subscription: object;
  created_at: string;
}

export interface NotificationSetting {
  id: string;
  employee_id: string;
  reminder_time: string; // HH:MM
  enabled: boolean;
}

// CE Export row (all 32 columns)
export interface CeRow {
  emp: string;
  type: number;       // 1=Reg, 2=OT
  otmult: string;
  class: string;
  job: string;
  phase: string;
  cat: string;
  department: string;
  worktype: number;   // 1=Job, 2=Shop
  unionloc: string;
  billat: string;
  hours: number;
  rate: string;
  amount: string;
  date: string;
  des1: string;
  des2: string;
  wcomp1: string;
  wcomp2: string;
  state: string;
  local: string;
  units: string;
  costtype: string;
  costcode: string;
  equipnum: string;
  equipcode: string;
  equiporder: string;
  equiphours: string;
  equipdes: string;
  account: string;
  starttime: string;
  endtime: string;
}

export const WORKER_CLASSES = [
  'LAB GEN', 'OPER A', 'FOREMAN', 'MECHANIC', 'CARP',
  'DRIVER', 'MGMT', 'LAB GENB', 'MASON', 'IRONWRKR',
] as const;

export const DEPARTMENTS = ['FIELD', 'SHOP', 'ADMIN'] as const;
