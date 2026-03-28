export type Role = 'worker' | 'manager' | 'admin'

export type ActivityType =
  | 'job'
  | 'shop_mechanic'
  | 'shop_office'
  | 'trucking'
  | 'plowing'
  | 'break'

export type PayType = 'regular' | 'overtime' | 'sick' | 'vacation' | 'double_time'

export type EntryStatus = 'pending' | 'approved' | 'flagged'

export type ChangeRequestStatus = 'pending' | 'approved' | 'denied'

export type PhotoType = 'job_photo' | 'receipt'

export interface Employee {
  id: string
  emp_id: string
  full_name: string
  role: Role
  default_class: string
  is_active: boolean
  created_at: string
}

export interface WorkerClass {
  id: string
  name: string
  is_active: boolean
}

export interface Project {
  id: string
  project_num: string
  name: string
  is_active: boolean
}

export interface Phase {
  id: string
  project_id: string
  phase_code: string
  name: string
  is_active: boolean
}

export interface Category {
  id: string
  phase_id: string
  cat_code: string
  description: string
  is_active: boolean
  // joined fields
  phase_code?: string
  project_id?: string
}

export interface Equipment {
  id: string
  name: string
  description: string
  is_active: boolean
}

export interface TruckingOption {
  id: string
  name: string
  is_active: boolean
  sort_order: number
}

export interface PlowLocation {
  id: string
  name: string
  is_active: boolean
  sort_order: number
}

export interface AppSetting {
  key: string
  value: string
}

export interface TimeEntry {
  id: string
  employee_id: string
  activity_type: ActivityType
  clock_in: string
  clock_out: string | null
  project_id: string | null
  category_id: string | null
  equipment_id: string | null
  trucking_option_id: string | null
  plow_location_id: string | null
  worker_class_id: string | null
  pay_type: PayType
  hours: number | null
  notes: string | null
  clock_in_lat: number | null
  clock_in_lng: number | null
  clock_out_lat: number | null
  clock_out_lng: number | null
  status: EntryStatus
  reviewed_by: string | null
  reviewed_at: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
  // joined fields
  employee?: Employee
  project?: Project
  category?: Category & { phase?: Phase }
  equipment?: Equipment
  trucking_option?: TruckingOption
  plow_location?: PlowLocation
  worker_class?: WorkerClass
}

export interface TimeChangeRequest {
  id: string
  time_entry_id: string
  requested_by: string
  message: string
  requested_clock_in: string | null
  requested_clock_out: string | null
  status: ChangeRequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  time_entry?: TimeEntry
  requester?: Employee
}

export interface Photo {
  id: string
  employee_id: string
  time_entry_id: string | null
  photo_type: PhotoType
  storage_path: string
  caption: string | null
  created_at: string
}

// CE Export row (32 columns for ComputerEase payroll import)
export interface CeRow {
  emp: string
  type: number
  otmult: string
  class: string
  job: string
  phase: string
  cat: string
  department: string
  worktype: number
  unionloc: string
  billat: string
  hours: number
  rate: string
  amount: string
  date: string
  des1: string
  des2: string
  wcomp1: string
  wcomp2: string
  state: string
  local: string
  units: string
  costtype: string
  costcode: string
  equipnum: string
  equipcode: string
  equiporder: string
  equiphours: string
  equipdes: string
  account: string
  starttime: string
  endtime: string
}

export const DEPARTMENTS = ['FIELD', 'SHOP', 'ADMIN'] as const
