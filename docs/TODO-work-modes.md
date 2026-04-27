# TODO — Work-mode routing (Job / Shop / Trucking)

> Status: design notes, not implemented. Captured 2026-04 from a conversation
> with the project owner. Pick up here when ready to build out a smarter
> input flow for the field.

## Why

The current clock-in flow makes every worker pick **job → phase → cat → class**.
That's right for a carpenter on a site, but wrong for a lot of the crew:

- **Truckers** know they're trucking *to* a specific job. They don't think
  in phase/cat terms — phase/cat for trucking is a small set of codes that
  vary slightly job-to-job. Asking a trucker to drill down into a phase
  list and find "trucking" inside it is friction we shouldn't make them
  pay every shift.
- **Shop workers** are usually working on a piece of equipment or a small
  internal job. The cost coding for shop work has its own department, GL
  account, description, and cost-code combination per equipment / shop
  task — none of which the worker should have to look up.

The job/phase/cat flow assumes the worker knows the cost-coding model.
Most of them shouldn't have to.

## Proposed worker UX

When a worker taps Clock In, **first** ask: are you doing
**Job work**, **Shop work**, or **Trucking** today?

```
┌──────────────────────────────────────────┐
│  What kind of work today?                │
│                                          │
│  [ 🏗  Job work ]                        │
│  [ 🔧  Shop work ]                       │
│  [ 🚛  Trucking  ]                       │
└──────────────────────────────────────────┘
```

### Job work
Existing flow — pick job → phase → cat (worker class assumed from
employee record, can be overridden by manager later).

### Trucking
1. Worker picks a **job** from the active list.
2. App auto-applies the trucking route for that job:
   - phase / cat → from a `work_mode_routes` row keyed on
     `(mode='trucking', job_code)`
   - worker class → assume **Driver** (overridable in admin)
   - WC1 / WC2, department, etc. → enrichEntry pulls from worker class
     defaults, same as today
3. Worker only sees: "Trucking · {job description}"

### Shop work
1. Worker picks the **shop task / equipment** from a flat list (e.g.
   "PC210 excavator", "Skid steer #3", "Yard cleanup").
2. App routes to the right combination:
   - sub-job / phase / cat → from `work_mode_routes` keyed on
     `(mode='shop', shop_code)`
   - department, GL account, description → from the same row
   - worker class → from employee defaults
3. Worker sees: "Shop · PC210 excavator"

The point is the worker only ever picks **one** thing per mode (a job for
trucking, a shop task for shop). Everything else is mapped.

## Data model sketch

New table:

```sql
create table public.work_mode_routes (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('trucking', 'shop')),
  -- For trucking: the job code the worker picked.
  -- For shop:    a stable shop-task / equipment code.
  selector text not null,
  -- Routed values:
  job_code text references jobs(job_code),
  phase text,
  cat text,
  class text references worker_classes(code),
  department text references departments(code),
  wcomp1 text references wcomp_codes(code),
  wcomp2 text references wcomp_codes(code),
  -- Display + cost-coding metadata:
  description text,
  gl_account text,
  cost_code text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (mode, selector)
);
```

Notes:
- `selector` is the thing the worker actually picks. For trucking it's a
  `job_code`; for shop it's a synthetic `shop_code` that we mint.
- `job_code` on the route may **differ** from `selector` for shop entries
  (a shop task often rolls up to a single internal "shop job" in
  ComputerEase, not the equipment code itself).
- Multiple shop selectors can point at the same job/phase/cat with different
  descriptions — that's how we capture "work on equipment X" vs. "work on
  equipment Y" while ComputerEase only sees the shop bucket.

## Mapping work — the data entry

This is the slow part the owner flagged. Every shop task and every
trucking-on-a-job combination needs a row in `work_mode_routes`.

- [ ] Decide the canonical shop-task list (with the shop foreman).
  Likely categories: equipment work, yard, fab, deliveries.
- [ ] For each shop task, gather: department, phase, cat, class, GL
      account, description, cost code. Enter as one row.
- [ ] For each active job, gather the trucking phase/cat for that job.
      Some jobs have unique trucking codes; some share. Enter one row
      per (job, mode='trucking').
- [ ] Decide a default trucking class (Driver) and default shop class
      (Shop Hand? confirm) and ensure those `worker_classes` rows
      exist.
- [ ] Workflow for new jobs: when a job is created, prompt admin to
      add its trucking route or copy from a "default" job.

## Engineering checklist

Roughly in order of dependency:

1. **Migration** — add `work_mode_routes` table + RLS (admin-write,
   authenticated-read).
2. **Admin CRUD** — `/admin/work-modes` with two tabs (Trucking, Shop).
   Bulk import from CSV would be a real time-saver given the data-entry
   volume.
3. **Worker UI** — replace the JobPicker on `/clock` with a mode picker
   first, then a one-step picker per mode (job for trucking, shop-task
   for shop, current 3-step picker for job).
4. **Server action** — extend `clockIn` and `switchWorkCode` to accept
   `{ mode, selector }` and resolve to the existing `{ job, phase, cat,
   class, department, ... }` shape via the routes table. Keep the old
   shape working for admin-edit paths.
5. **enrichEntry** — read GL account / cost code / description from the
   matched route when present. Fall back to existing employee/job
   defaults otherwise.
6. **ComputerEase export** — confirm the routed values produce a clean
   import. The export already pulls everything off `time_entries`, so
   if the route fields are written into the row at clock-in time we
   shouldn't need to change the exporter.
7. **Manager / admin overrides** — the entry editor should still let an
   admin change job/phase/cat/class freely. Decide whether the route
   selector is also editable post-hoc, or whether overrides shadow the
   route silently.
8. **Reporting** — admins likely want to see "hours by shop task" and
   "trucking hours by job" — extend `/admin/entries` filters accordingly.

## Open questions

- **Shop class default**: confirm with the shop foreman. Trucking is
  Driver; shop is probably a single class but worth checking.
- **Multi-class shop workers**: what if a shop hand also does field
  work? Probably handled by them picking "Job work" that day, not by
  the route table.
- **Driver doing field work**: same answer — they pick "Job work" and
  the regular job/phase/cat flow takes over.
- **Half-day mode switches**: if a worker switches from Trucking to
  Job work mid-shift (likely!), the existing "Switch code" flow should
  open the mode picker again rather than the job/phase/cat picker.
- **Equipment tracking**: shop work often implies "this equipment was
  used X hours today." Worth a separate equipment-usage feature, or
  do we let the shop-task selector double as equipment tracking?
- **Crew leader mode**: if a foreman ever clocks in a whole crew at
  once (busybusy supports this), the mode picker compounds with that.
  Out of scope for now but worth flagging.
- **Conflict with the existing JobPicker**: the picker is also used on
  request-change and admin entry-edit screens. Decide whether those
  surfaces also get the mode picker or stay on the cost-coding view.

## Why this is worth doing

It's the difference between an app that's "yet another timeclock" and
one that fits how AJK actually works. Every other timekeeping app on the
market makes the worker learn the accountant's data model. The bet here
is that the workers shouldn't have to.
