-- PayrollAuto initial schema
-- Feeds the ComputerEase payroll import layout (see payroll+import+layout (2).xls)

create extension if not exists "uuid-ossp";

-- Roles: admin | manager | worker
create type user_role as enum ('admin', 'manager', 'worker');

-- ComputerEase hours type: 1=Reg, 2=OT, 3=Double, 4=Sick, 5=Vac, 6=Holiday
-- (7=Other, 8=NonTax, 9=Bonus reserved for admin use)
-- worktype: 1=Job, 2=Shop, 3=Travel

-- Status lifecycle for a time entry
create type entry_status as enum ('draft', 'submitted', 'approved', 'locked', 'exported');

-- ============================================================
-- Reference tables (admin-maintained)
-- ============================================================

create table departments (
  code text primary key,
  description text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table worker_classes (
  code text primary key,
  description text not null,
  default_wcomp1 text,
  default_wcomp2 text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table wcomp_codes (
  code text primary key,
  description text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table jobs (
  job_code text primary key,
  description text not null,
  state text,                -- 2-char state code
  local text,                -- taxing locality
  default_worktype smallint not null default 1,  -- 1=Job, 2=Shop, 3=Travel
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table phases (
  job_code text not null references jobs(job_code) on delete cascade,
  phase_code text not null,
  description text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (job_code, phase_code)
);

create table categories (
  job_code text not null,
  phase_code text not null,
  cat_code text not null,
  description text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (job_code, phase_code, cat_code),
  foreign key (job_code, phase_code) references phases(job_code, phase_code) on delete cascade
);

-- ============================================================
-- Employees (mirror of auth.users with company-specific fields)
-- ============================================================

create table employees (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  emp_code text unique not null,              -- ComputerEase emp (8 chars max)
  first_name text not null,
  last_name text not null,
  role user_role not null default 'worker',
  department text references departments(code),
  default_class text references worker_classes(code),
  default_rate numeric(8,4),
  default_wcomp1 text references wcomp_codes(code),
  default_wcomp2 text references wcomp_codes(code),
  manager_id uuid references employees(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on employees (role) where active;
create index on employees (manager_id) where active;

-- ============================================================
-- Time entries
-- ============================================================

create table time_entries (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete restrict,
  date date not null,
  start_time time,                            -- null for sick/pto entries
  end_time time,
  hours numeric(5,2) not null,
  type smallint not null default 1,           -- 1=Reg 2=OT 3=Double 4=Sick 5=Vac 6=Holiday
  otmult numeric(3,2),                        -- 1.50 for OT, 2.00 for Double
  job text references jobs(job_code),
  phase text,
  cat text,
  class text references worker_classes(code),
  department text references departments(code),
  worktype smallint,                          -- 1=Job, 2=Shop, 3=Travel
  wcomp1 text references wcomp_codes(code),
  wcomp2 text references wcomp_codes(code),
  rate numeric(8,4),
  notes text,                                 -- becomes des1 (+ des2 if > 30 chars)
  voice_text text,
  clock_in_lat numeric(9,6),
  clock_in_lng numeric(9,6),
  clock_out_lat numeric(9,6),
  clock_out_lng numeric(9,6),
  status entry_status not null default 'draft',
  approved_by uuid references employees(id),
  approved_at timestamptz,
  locked_at timestamptz,
  exported_at timestamptz,
  created_by uuid references employees(id),
  created_at timestamptz not null default now(),
  edited_by uuid references employees(id),
  edited_at timestamptz,
  foreign key (job, phase) references phases(job_code, phase_code),
  foreign key (job, phase, cat) references categories(job_code, phase_code, cat_code)
);

create index on time_entries (employee_id, date);
create index on time_entries (status);
create index on time_entries (date);

-- ============================================================
-- Photos (receipts + job photos)
-- ============================================================

create type photo_kind as enum ('receipt', 'job');

create table entry_photos (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  time_entry_id uuid references time_entries(id) on delete set null,
  storage_path text not null,                 -- path in the 'photos' bucket
  kind photo_kind not null default 'job',
  caption text,
  uploaded_at timestamptz not null default now()
);

create index on entry_photos (employee_id, uploaded_at desc);

-- ============================================================
-- Change requests
-- ============================================================

create type change_status as enum ('pending', 'approved', 'rejected');

create table change_requests (
  id uuid primary key default uuid_generate_v4(),
  time_entry_id uuid not null references time_entries(id) on delete cascade,
  requested_by uuid not null references employees(id),
  requested_at timestamptz not null default now(),
  message text,
  voice_text text,
  proposed_changes jsonb,
  status change_status not null default 'pending',
  resolved_by uuid references employees(id),
  resolved_at timestamptz,
  resolution_note text
);

create index on change_requests (status, requested_at);

-- ============================================================
-- Week locks — once a week passes, workers can't edit it anymore
-- ============================================================

create table week_locks (
  week_start date primary key,                -- Monday of the locked week
  locked_at timestamptz not null default now(),
  locked_by uuid references employees(id)
);

-- ============================================================
-- Helper functions for RLS
-- ============================================================

create or replace function current_employee_id() returns uuid
language sql stable security definer as $$
  select id from employees where auth_user_id = auth.uid() and active limit 1;
$$;

create or replace function current_employee_role() returns user_role
language sql stable security definer as $$
  select role from employees where auth_user_id = auth.uid() and active limit 1;
$$;

create or replace function is_week_locked(d date) returns boolean
language sql stable as $$
  select exists (
    select 1 from week_locks
    where week_start = date_trunc('week', d)::date  -- Monday
  );
$$;

-- ============================================================
-- Enable RLS
-- ============================================================

alter table departments enable row level security;
alter table worker_classes enable row level security;
alter table wcomp_codes enable row level security;
alter table jobs enable row level security;
alter table phases enable row level security;
alter table categories enable row level security;
alter table employees enable row level security;
alter table time_entries enable row level security;
alter table entry_photos enable row level security;
alter table change_requests enable row level security;
alter table week_locks enable row level security;

-- Everyone signed in can read reference data
create policy ref_read_all on departments for select using (auth.uid() is not null);
create policy ref_read_all on worker_classes for select using (auth.uid() is not null);
create policy ref_read_all on wcomp_codes for select using (auth.uid() is not null);
create policy ref_read_all on jobs for select using (auth.uid() is not null);
create policy ref_read_all on phases for select using (auth.uid() is not null);
create policy ref_read_all on categories for select using (auth.uid() is not null);

-- Only admin writes reference data
create policy ref_admin_write on departments for all
  using (current_employee_role() = 'admin') with check (current_employee_role() = 'admin');
create policy ref_admin_write on worker_classes for all
  using (current_employee_role() = 'admin') with check (current_employee_role() = 'admin');
create policy ref_admin_write on wcomp_codes for all
  using (current_employee_role() = 'admin') with check (current_employee_role() = 'admin');
create policy ref_admin_write on jobs for all
  using (current_employee_role() = 'admin') with check (current_employee_role() = 'admin');
create policy ref_admin_write on phases for all
  using (current_employee_role() = 'admin') with check (current_employee_role() = 'admin');
create policy ref_admin_write on categories for all
  using (current_employee_role() = 'admin') with check (current_employee_role() = 'admin');

-- Employees: everyone reads roster; only admin writes
create policy employees_read_all on employees for select using (auth.uid() is not null);
create policy employees_admin_write on employees for all
  using (current_employee_role() = 'admin') with check (current_employee_role() = 'admin');

-- Time entries:
--   worker: read/write own, only when week not locked & status is draft/submitted
--   manager: read all, update limited fields (class/job/phase/cat/status)
--   admin: all
create policy te_worker_read on time_entries for select
  using (employee_id = current_employee_id());

create policy te_worker_insert on time_entries for insert
  with check (
    employee_id = current_employee_id()
    and not is_week_locked(date)
  );

create policy te_worker_update on time_entries for update
  using (
    employee_id = current_employee_id()
    and status in ('draft','submitted')
    and not is_week_locked(date)
  ) with check (
    employee_id = current_employee_id()
    and status in ('draft','submitted')
    and not is_week_locked(date)
  );

create policy te_worker_delete on time_entries for delete
  using (
    employee_id = current_employee_id()
    and status = 'draft'
    and not is_week_locked(date)
  );

create policy te_manager_read on time_entries for select
  using (current_employee_role() in ('manager','admin'));

create policy te_manager_update on time_entries for update
  using (current_employee_role() in ('manager','admin'))
  with check (current_employee_role() in ('manager','admin'));

create policy te_admin_all on time_entries for all
  using (current_employee_role() = 'admin')
  with check (current_employee_role() = 'admin');

-- Photos
create policy photos_worker_own on entry_photos for all
  using (employee_id = current_employee_id())
  with check (employee_id = current_employee_id());

create policy photos_manager_read on entry_photos for select
  using (current_employee_role() in ('manager','admin'));

create policy photos_admin_write on entry_photos for all
  using (current_employee_role() = 'admin')
  with check (current_employee_role() = 'admin');

-- Change requests
create policy cr_worker_own on change_requests for all
  using (requested_by = current_employee_id())
  with check (requested_by = current_employee_id());

create policy cr_manager_read on change_requests for select
  using (current_employee_role() in ('manager','admin'));

create policy cr_manager_resolve on change_requests for update
  using (current_employee_role() in ('manager','admin'))
  with check (current_employee_role() in ('manager','admin'));

-- Week locks — admin only
create policy wl_read_all on week_locks for select using (auth.uid() is not null);
create policy wl_admin_write on week_locks for all
  using (current_employee_role() = 'admin')
  with check (current_employee_role() = 'admin');

-- ============================================================
-- Storage bucket for photos
-- ============================================================

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

-- Workers can upload/read files whose path starts with their emp_code
create policy photos_owner_all on storage.objects for all
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (
      select emp_code from employees where id = current_employee_id()
    )
  ) with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (
      select emp_code from employees where id = current_employee_id()
    )
  );

create policy photos_admin_all on storage.objects for all
  using (bucket_id = 'photos' and current_employee_role() in ('manager','admin'))
  with check (bucket_id = 'photos' and current_employee_role() = 'admin');
