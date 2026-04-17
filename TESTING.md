# Testing & refinement plan

Running checklist for validating every feature end-to-end. Start at step 1 and work down; each step builds on the previous.

## Feature surface (reference)

**Worker** (role: `worker`)
- [worker/clock](src/app/(worker)/clock/page.tsx) — clock in/out, job + class + dept + cost code selection
- [worker/week](src/app/(worker)/week/page.tsx) — current week summary, submit for approval
- [worker/sick](src/app/(worker)/sick/page.tsx) — request sick time
- [worker/request-change](src/app/(worker)/request-change/page.tsx) — ask for a correction on a past entry
- [worker/photos](src/app/(worker)/photos/page.tsx) — view/upload photos

**Manager** (role: `manager`) — everything workers see, plus:
- [manager/approve](src/app/(manager)/approve/page.tsx) — review submitted entries, approve/reject (red-dot badge)

**Admin** (role: `admin`)
- [admin](src/app/admin/page.tsx) — dashboard
- [admin/employees](src/app/admin/employees/page.tsx) + [new](src/app/admin/employees/new/page.tsx) + [edit](src/app/admin/employees/[id]/page.tsx)
- [admin/jobs](src/app/admin/jobs/page.tsx) + [new](src/app/admin/jobs/new/page.tsx) + [detail](src/app/admin/jobs/[code]/page.tsx)
- [admin/classes](src/app/admin/classes/page.tsx), [admin/departments](src/app/admin/departments/page.tsx), [admin/wcomp](src/app/admin/wcomp/page.tsx)
- [admin/entries](src/app/admin/entries/page.tsx) + [detail](src/app/admin/entries/[id]/page.tsx)
- [admin/requests](src/app/admin/requests/page.tsx) — worker change requests
- [admin/export](src/app/admin/export/page.tsx) + [/api/export](src/app/api/export/route.ts)

**Auth / bootstrap**
- [login](src/app/login/page.tsx) — sign in by `emp_code` + password (Supabase email synthesized from code)
- [setup](src/app/setup/page.tsx) — create first admin (self-disables once any admin exists)
- [/](src/app/page.tsx) redirect — admin → `/admin`; everyone else → `/clock`

---

## 1. Auth — ✅ passed

- [x] **A. `/setup` gating** — renders only when 0 admins exist; otherwise redirects to `/login`
- [x] **B. Login happy path (admin)** — lands on `/admin`
- [x] **C. Login happy path (worker/manager)** — lands on `/clock`; manager sees "Approve" tab with red-dot badge
- [x] **D. Error surfaces** — wrong password and unknown emp_code both produce `invalid_credentials` (by design, Supabase does not distinguish to prevent account enumeration)
- [x] **E. Auth gate** — unauthenticated hits redirect to `/login`; authenticated hits to `/login` or `/setup` redirect to `/`
- [x] **F. Sign-out** — lands on `/login`, back button doesn't re-auth

## 2. Admin reference data — ⏳ next

Sign in as admin.

### A. Departments ([/admin/departments](src/app/admin/departments/page.tsx))
- [ ] Add a new department (code + description) — row appears, code uppercased
- [ ] Toggle Active on a row — label flips green ↔ grey
- [ ] Add with empty code or description — inline red "Code and description required."
- [ ] Add a duplicate code — red error with Postgres unique-violation message
- [ ] Delete a department that's **not** referenced — row disappears
- [ ] Delete one that **is** referenced — `alert()` with FK violation (by design, see [RefTable.tsx:57-64](src/app/admin/_ref/RefTable.tsx#L57-L64))

### B. Worker classes ([/admin/classes](src/app/admin/classes/page.tsx))
- [ ] Same add/toggle/delete as Departments
- [ ] Pick WC1 / WC2 defaults from dropdowns; leave blank saves null
- [ ] Create a class with WC unset; verify defaults don't carry into clock-in later (step 4)

### C. Workers' comp codes ([/admin/wcomp](src/app/admin/wcomp/page.tsx))
- [ ] Add a WC code
- [ ] Deactivate a WC code — disappears from WC dropdowns on `/admin/classes` (filtered by `active=true`)

### D. Jobs ([/admin/jobs](src/app/admin/jobs/page.tsx))
- [ ] **+ Add job** → fill code/description/state/local/worktype → appears in list
- [ ] Open job detail → add a phase → add a category inside that phase
- [ ] Delete a category, then delete a phase — both revalidate
- [ ] Duplicate phase code within same job — PK violation

### E. Jobs CSV bulk import ([JobsImport](src/app/admin/jobs/page.tsx#L27))
- [ ] **Jobs format** (`job_code,description,state,local`) — with and without header row
- [ ] **Phase/cat format** (`job,phase,cat,description`) — empty `cat` inserts phase, filled inserts category
- [ ] 5-column garbage → "Could not detect CSV layout."
- [ ] Partial failures → result shows `{inserted, errors[]}` (cap 10)
- [ ] Re-running same CSV is idempotent (uses `upsert`). **Note:** import does not touch `active` or `default_worktype` — won't reactivate a deactivated job.

## 3. Admin employees — ⏳ pending

- [ ] Create employee (password required server-side, min 8 chars)
- [ ] Edit an employee without changing `emp_code`
- [ ] **Rename `emp_code`** — auth email should sync via `admin.auth.admin.updateUserById`; login with new code works immediately
- [ ] Toggle role worker ↔ manager ↔ admin
- [ ] Delete an employee via `pnpm delete:employee <CODE>` — removes both the `employees` row and the linked `auth.users` row

## 4. Worker clock-in flow — ⏳ pending

- [ ] Clock in: pick job → phase → category → class → dept
- [ ] Clock out — duration computed, visible on week view, **status auto-flips `draft` → `submitted`** (no manual submit)
- [ ] Only one open entry at a time
- [ ] Class defaults for WC1/WC2 propagate to the entry
- [ ] `/week` shows the current week; totals add up

**Note:** there is no "Submit for approval" button by design. Clock-out is the submit event (see [clock/actions.ts:89](src/app/(worker)/clock/actions.ts#L89)). Workers edit mistakes via change requests (step 6), not direct edits.

## 5. Manager approvals — ⏳ pending

- [ ] Bottom nav shows "Approve" tab with red-dot count = entries where `status='submitted'`
- [ ] Open `/approve` — list of submitted entries grouped by worker for the week
- [ ] Approve one — moves to `approved`, badge count decreases
- [ ] Edit class/job inline and save — entry is updated (still needs explicit approve after)
- [ ] Manager can also clock themselves in (lands on `/clock` by default)

**No reject-to-worker path.** Managers approve or edit+approve. Worker-side corrections happen via change requests.

## 5b. Admin push-back (timecard rework) — ⏳ pending

Admin can revert selected approved entries back to `submitted` so the manager re-reviews.

- [ ] On [/admin/entries](src/app/admin/entries/page.tsx), approved rows show a checkbox; others are disabled
- [ ] Select one or more approved entries → action bar appears with an optional note field
- [ ] "Push back to manager" → entries flip to `submitted`, `approved_by`/`approved_at` cleared, `admin_note` + `pushed_back_at` stamped
- [ ] Manager's `/approve` page shows a "↩ Pushed back by admin — <note>" banner above each affected row
- [ ] Re-approving a pushed-back entry works (status returns to `approved`; `admin_note` stays as an audit trail)
- [ ] Guard: selecting a non-approved row is blocked by the disabled checkbox; server action also filters by `status='approved'`

## 6. Change requests — ⏳ pending

Workers file a freeform note; admins read it and manually fix the referenced entry.

- [ ] Worker on `/request-change` picks an entry, submits a correction message
- [ ] Admin sees it on `/admin/requests` with an "Open entry" link → jumps to `/admin/entries/[id]`
- [ ] Admin makes the fix on the entry page, returns to `/admin/requests`
- [ ] **"Mark done"** → sets `status='approved'` on the request (acknowledgement only — no auto-apply)
- [ ] **"Dismiss"** → sets `status='rejected'`
- [ ] Resolved requests drop off the pending list

## 7. Sick time & photos — ⏳ pending

- [ ] `/sick` — submit a sick-time entry (hours, date, note); appears in admin entries
- [ ] `/photos` — upload a photo; view list; photo is scoped to the employee; admin can view via [/api/photo/[id]](src/app/api/photo/[id]/route.ts)

## 8. Payroll export — ⏳ pending

- [ ] `/admin/export` — pick a date range → triggers [/api/export](src/app/api/export/route.ts)
- [ ] Download opens correctly (CSV/Excel — confirm which)
- [ ] Only `approved` entries appear in export
- [ ] Columns match what ComputerEase import expects

---

## Known-good facts worth remembering

- **Supabase email synthesis** — login does `codeToEmail(emp_code)`, so renaming `emp_code` without syncing `auth.users` used to soft-brick users. Fixed in `e2019e8`.
- **Password required** — server-side check added in `ef0f0ec` after an incident where blank form password silently created a passwordless auth user.
- **`invalid_credentials`** — Supabase returns this for both wrong password and unknown email (anti-enumeration). Do not try to distinguish client-side.
- **Job import is upsert + idempotent** — but won't reactivate deactivated jobs.
- **Entry lifecycle** — `draft` (open shift) → `submitted` (on clock-out, auto) → `approved` (manager) → `exported` (payroll run). `locked` is set when a week lock kicks in.
- **Change requests are freeform notes** — no structured `proposed_changes`. Admins fix the entry manually and then "Mark done" the request.
- **Admin push-back** — reverts `approved` → `submitted` on individual entries, with an optional note to the manager. Column: `admin_note`, stamp: `pushed_back_at` + `pushed_back_by` (migration `0002_entry_pushback.sql`).
