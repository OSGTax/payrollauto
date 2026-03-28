# CrewClock v2 -- Full Implementation Plan

## Overview
Complete rebuild of the AJK Construction timekeeping PWA. Clean slate -- no code carried over from v1. Same free-tier stack: **React + TypeScript + Vite PWA + Supabase + Vercel**.

Target: ~50 employees. Cost: $0 (Supabase free tier + Vercel free tier).

---

## 1. Database Schema (Supabase / PostgreSQL)

### `employees`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| emp_id | TEXT UNIQUE | Format: AJK + LASTNAME (e.g. AJKSMITH) |
| full_name | TEXT | |
| role | TEXT | `worker` / `manager` / `admin` |
| default_class | TEXT | FK to worker_classes. Pre-populated on clock-in |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

### `worker_classes`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT UNIQUE | e.g. LAB GEN, OPER A, FOREMAN, DRIVER, MECHANIC, MGMT, etc. |
| is_active | BOOLEAN | |

### `projects` (Jobs)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| project_num | TEXT UNIQUE | Format: xx-xxx (e.g. 24-001) |
| name | TEXT | |
| is_active | BOOLEAN | |

### `phases`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| project_id | UUID FK → projects | |
| phase_code | TEXT | Format: xx (e.g. 03) |
| name | TEXT | |
| is_active | BOOLEAN | |
| UNIQUE(project_id, phase_code) | | |

### `categories`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| phase_id | UUID FK → phases | |
| cat_code | TEXT | Format: xxxx (e.g. 1010) |
| description | TEXT | **This is what workers see in the dropdown** |
| is_active | BOOLEAN | |
| UNIQUE(phase_id, cat_code) | | |

**Key design**: Each category's `description` is what workers pick from. Since each category code is globally unique, the system auto-determines the phase. Workers see: Job dropdown → Category description dropdown (filtered to that job's categories across all phases). Phase is inferred.

### `equipment`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT | e.g. T-101 |
| description | TEXT | e.g. 2019 Ford F-350 Dump |
| is_active | BOOLEAN | |

### `trucking_options`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT | Admin-defined trucking types |
| is_active | BOOLEAN | |
| sort_order | INT | For dropdown ordering |

### `plow_locations`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | TEXT | e.g. Walmart Plaza, City Hall Lot |
| is_active | BOOLEAN | |
| sort_order | INT | |

### `app_settings`
| Column | Type | Notes |
|---|---|---|
| key | TEXT PK | e.g. `plowing_enabled` |
| value | TEXT | e.g. `true` / `false` |

### `time_entries`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| employee_id | UUID FK → employees | |
| activity_type | TEXT | `job` / `shop_mechanic` / `shop_office` / `trucking` / `plowing` / `break` |
| clock_in | TIMESTAMPTZ | |
| clock_out | TIMESTAMPTZ | NULL = currently active |
| -- Job fields -- | | |
| project_id | UUID FK → projects | NULL unless activity_type=job |
| category_id | UUID FK → categories | NULL unless activity_type=job (phase inferred from this) |
| -- Shop fields -- | | |
| equipment_id | UUID FK → equipment | NULL unless activity_type=shop_mechanic |
| -- Trucking fields -- | | |
| trucking_option_id | UUID FK → trucking_options | NULL unless activity_type=trucking |
| -- Plowing fields -- | | |
| plow_location_id | UUID FK → plow_locations | NULL unless activity_type=plowing |
| -- Common fields -- | | |
| worker_class_id | UUID FK → worker_classes | Confirmed at clock-in |
| pay_type | TEXT | `regular` / `overtime` / `sick` / `vacation` / `double_time` (default: regular, OT auto-calculated on export) |
| hours | NUMERIC | Computed on clock-out, or manual for sick/vacation |
| notes | TEXT | Free text or voice-to-text input |
| -- GPS -- | | |
| clock_in_lat | DOUBLE PRECISION | |
| clock_in_lng | DOUBLE PRECISION | |
| clock_out_lat | DOUBLE PRECISION | |
| clock_out_lng | DOUBLE PRECISION | |
| -- Review -- | | |
| status | TEXT | `pending` / `approved` / `flagged` |
| reviewed_by | UUID FK → employees | |
| reviewed_at | TIMESTAMPTZ | |
| admin_notes | TEXT | |
| -- Metadata -- | | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `time_change_requests`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| time_entry_id | UUID FK → time_entries | |
| requested_by | UUID FK → employees | |
| message | TEXT | Free text or voice-to-text explanation |
| requested_clock_in | TIMESTAMPTZ | NULL if not changing |
| requested_clock_out | TIMESTAMPTZ | NULL if not changing |
| status | TEXT | `pending` / `approved` / `denied` |
| reviewed_by | UUID FK → employees | |
| reviewed_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

### `photos`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| employee_id | UUID FK → employees | |
| time_entry_id | UUID FK → time_entries | NULL for standalone receipt uploads |
| photo_type | TEXT | `job_photo` / `receipt` |
| storage_path | TEXT | Supabase Storage path |
| caption | TEXT | |
| created_at | TIMESTAMPTZ | |

### Row Level Security
- **Workers**: CRUD own time_entries (current week only for create/update), read reference tables, create own change requests, upload own photos
- **Managers**: Read all time_entries, update job/phase/category + worker_class on any entry, approve/flag entries, read change requests
- **Admin**: Full CRUD on everything -- all tables, all entries, all settings

### Week Lockdown Logic
- Workers can only create/edit entries in the **current week** (Mon-Sun)
- Exception: workers can backdate **sick days** within the current week only, max 8 hours/day
- Once a week rolls over, only managers and admin can edit past entries
- Enforced at RLS level + UI level

---

## 2. Authentication

- **Supabase Auth** with email (emp_id@crew.local) + password
- Admin creates all accounts and sets passwords
- Admin can reset any password from the admin panel
- No self-registration

---

## 3. UI / Screens

### 3a. Login Screen
- Company logo (AJK) prominently displayed
- Employee ID input (big, clear)
- Password input
- "Sign In" button
- Clean, simple, mobile-first

### 3b. Clock-In Screen (Home -- Worker View)
**Not clocked in:**
- AJK logo at top
- Big circular **"CLOCK IN"** button (center of screen)
- Current date/time displayed
- Tapping "CLOCK IN" opens the **Activity Dashboard**

**Activity Dashboard (appears after tapping CLOCK IN):**
- 4 tabs across the top: **JOB** | **SHOP** | **TRUCKING** | **PLOWING**
  - PLOWING tab only visible when admin has toggled `plowing_enabled = true`
- Each tab shows relevant inputs:

**JOB tab:**
1. Job dropdown (active projects)
2. Category dropdown (filtered: shows all categories across all phases for selected job, displays the category `description`)
3. Worker Class dropdown (pre-selected with employee's default, **highlighted/pulsing to prompt confirmation**)
4. "Start" button

**SHOP tab:**
- Sub-selector: **Mechanic** | **Office**
  - Mechanic: Equipment dropdown (list of all active equipment)
  - Office: No additional input needed (auto-fills)
- Worker Class dropdown (same highlight behavior)
- "Start" button

**TRUCKING tab:**
- Trucking type dropdown (admin-managed list)
- Worker Class dropdown
- "Start" button

**PLOWING tab:**
- Plow location dropdown (admin-managed list)
- Worker Class dropdown
- "Start" button

**Clocked in (active timer):**
- Shows: current activity type badge, specific details (e.g. "24-001 > Concrete Foundations"), elapsed time counter
- Worker class displayed
- Two prominent action buttons:
  - **"SWITCH"** -- Opens Activity Dashboard pre-populated with current job (changeable). Seamlessly clocks out of current and into new code.
  - **"BREAK"** -- One tap. Creates a break entry. Shows "ON BREAK" state with elapsed break time and **"END BREAK"** button that one-tap resumes previous activity.
- Smaller actions: Add note (text + voice icon), Take photo, Upload receipt

### 3c. Timesheet Screen (Worker View)
- Weekly view (Mon-Sun) with day-by-day breakdown
- Each day shows entries with: activity type, details, hours, status badge
- Total hours for the week
- Ability to request time changes (opens form with message field + voice input)
- Sick day entry: select a date (current week only), auto-fills 8 hours
- Vacation day entry: similar to sick, select date

### 3d. Manager Dashboard
- **Weekly approval view**: List of all active employees
  - Each employee shows: name, total hours, entry count, approval status
  - Expand to see individual entries
  - Checkbox to approve each employee's timecard
  - Batch "Approve All" button
- **Entry editing**: Managers can change only:
  - Job / Phase / Category (cascading dropdowns)
  - Worker Class
- **Time change requests**: View pending requests, approve/deny
- **Cannot**: Change times, delete entries, access admin settings

### 3e. Admin Dashboard
- Everything managers can do, plus:
- **Full entry editing**: Change any field on any entry (times, activity type, pay type, all codes)
- **Employee management**: Create/edit employees, set roles, reset passwords, activate/deactivate
- **Reference data management**:
  - Projects: Add/edit jobs
  - Phases: Add/edit phases per job
  - Categories: Add/edit categories per phase
  - Equipment: Add/edit equipment list
  - Trucking options: Add/edit trucking types
  - Plow locations: Add/edit plow locations
  - Worker classes: Add/edit classes
- **App settings**: Toggle plowing on/off, other feature flags
- **CE Payroll Export**:
  - Select date range
  - Preview all entries mapped to CE schema
  - Edit any CE field before export
  - Download CSV/TSV for ComputerEase import
- **Import**: CSV upload for bulk data (jobs, phases, categories from CE raw data)
- **Password reset**: Pick employee, set new password

### 3f. Settings Screen
- Account info display
- Change own password
- App version

---

## 4. Key Features

### 4a. Voice-to-Text
- Uses browser **Web Speech API** (free, works on mobile Chrome/Safari)
- Available anywhere there's a text input for notes/messages
- Microphone icon next to input fields
- Tap to start recording, tap again to stop
- Transcribed text populates the field

### 4b. Photo & Receipt Upload
- Camera capture or gallery pick
- Tag as `job_photo` or `receipt`
- Stored in Supabase Storage bucket
- Viewable in timesheet and admin views

### 4c. GPS Pin Drop
- Captured on clock-in and clock-out
- Uses browser Geolocation API
- Optional (graceful degradation if denied)
- Viewable by managers/admin on entries

### 4d. Time Change Requests
- Worker submits: which entry, what change, message (text or voice)
- Shows in manager/admin dashboard as pending
- Approve applies the change, deny keeps original
- Worker sees status of their requests

### 4e. CE Payroll Export
- Maps time_entries to the 32-column ComputerEase payroll import format
- Admin defines how non-job entries (shop/trucking/plowing) map to CE fields
  - This mapping will be configurable in admin settings
- Auto-calculates OT (>40 hrs/week = overtime)
- Handles all pay types: regular, OT, sick, vacation, double time
- All CE fields (department, worktype, wcomp, etc.) editable before export
- Download as CSV or tab-delimited file

### 4f. Week Lockdown
- Current week (Mon-Sun): workers can create/edit freely
- Past weeks: locked for workers, editable by managers (limited) and admin (full)
- Sick days: workers can backdate within current week, max 8 hrs/day
- Enforced at database (RLS) and UI level

### 4g. Offline Support (PWA)
- Service worker caches app shell
- IndexedDB stores pending entries when offline
- Syncs when connection restored
- Installable on mobile home screen

---

## 5. Tech Stack

| Layer | Technology | Cost |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | Free |
| Styling | Tailwind CSS 4 | Free |
| PWA | vite-plugin-pwa + Workbox | Free |
| Database | Supabase PostgreSQL | Free tier (500MB, 50K rows) |
| Auth | Supabase Auth | Free tier (50K MAU) |
| Storage | Supabase Storage | Free tier (1GB) |
| Hosting | Vercel | Free tier |
| Voice | Web Speech API (browser native) | Free |
| GPS | Geolocation API (browser native) | Free |

---

## 6. Build Order (Phases)

### Phase 1: Foundation
1. Wipe repo, scaffold fresh Vite + React + TS + Tailwind project
2. Supabase schema: create all tables, indexes, RLS policies via migration
3. Auth setup: login screen, Supabase auth integration, role-based routing
4. Layout: header with AJK logo, bottom nav, role-based navigation

### Phase 2: Worker Experience (Core)
5. Clock-in screen: big button, activity dashboard with 4 tabs
6. JOB tab: project dropdown → category dropdown (phase auto-inferred), worker class confirmation
7. SHOP tab: mechanic (equipment dropdown) / office modes
8. TRUCKING tab: trucking options dropdown
9. PLOWING tab: plow locations dropdown (conditionally visible)
10. Active timer view: current activity display, elapsed time
11. SWITCH flow: pre-populated dashboard, seamless clock-out/clock-in
12. BREAK flow: one-tap break, one-tap resume to previous activity
13. GPS capture on clock-in/clock-out

### Phase 3: Worker Features
14. Timesheet screen: weekly view, day breakdown, hours totals
15. Sick day entry: date picker (current week), 8hr cap
16. Vacation day entry
17. Time change request: form with message + voice input
18. Notes: text input + voice-to-text (Web Speech API)
19. Photo/receipt upload to Supabase Storage

### Phase 4: Manager Experience
20. Manager dashboard: weekly employee list with approval checkboxes
21. Entry detail view: expand employee to see entries
22. Limited editing: job/phase/category + worker class only
23. Time change request review: approve/deny queue
24. Batch approval

### Phase 5: Admin Experience
25. Full entry editing: all fields on any entry
26. Employee management: CRUD + password reset
27. Reference data management: projects, phases, categories, equipment, trucking, plowing, worker classes
28. App settings: plowing toggle, feature flags
29. CSV import for bulk data loading

### Phase 6: Export & Polish
30. CE Payroll export: map entries to 32-column schema
31. Admin-configurable mapping for non-job entries
32. Pre-export preview with editable fields
33. CSV/TSV download
34. PWA setup: service worker, offline support, installable manifest
35. Company logo integration throughout (login, header, PWA icons)
36. Final testing and cleanup

---

## 7. File Structure

```
payroll-pwa/
├── public/
│   ├── logo.png              # AJK company logo
│   ├── icons/                # PWA icons (192, 512)
│   └── favicon.ico
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Router + auth guard
│   ├── index.css             # Tailwind base
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client
│   │   ├── auth.tsx          # Auth context + provider
│   │   └── types.ts          # All TypeScript interfaces
│   ├── components/
│   │   ├── Layout.tsx        # Header + bottom nav + logo
│   │   ├── ProtectedRoute.tsx
│   │   ├── BigButton.tsx     # Reusable circular clock button
│   │   ├── Dropdown.tsx      # Styled select component
│   │   ├── VoiceInput.tsx    # Text input with mic icon
│   │   ├── PhotoUpload.tsx   # Camera/gallery + receipt tagging
│   │   └── StatusBadge.tsx   # pending/approved/flagged badges
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── ClockScreen.tsx         # Main clock-in/out + activity dashboard
│   │   ├── ActivityDashboard.tsx   # 4-tab selector (job/shop/trucking/plowing)
│   │   ├── ActiveTimer.tsx         # Clocked-in state with switch/break
│   │   ├── TimesheetScreen.tsx     # Weekly timesheet view
│   │   ├── ManagerDashboard.tsx    # Approval workflow
│   │   ├── AdminDashboard.tsx      # Full admin panel
│   │   ├── AdminEntryEditor.tsx    # Edit any entry field
│   │   ├── AdminEmployees.tsx      # Employee CRUD + password reset
│   │   ├── AdminData.tsx           # Reference data management
│   │   ├── AdminExport.tsx         # CE payroll export
│   │   ├── AdminSettings.tsx       # App toggles (plowing, etc.)
│   │   └── SettingsScreen.tsx      # User settings
│   └── hooks/
│       ├── useTimer.ts       # Elapsed time counter
│       ├── useGps.ts         # Geolocation capture
│       ├── useVoice.ts       # Web Speech API hook
│       └── useWeekLock.ts    # Current week boundary logic
├── supabase/
│   └── migrations/
│       └── 001_schema.sql    # Complete fresh schema
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── vercel.json
```

---

## 8. Notes

- **No old code**: The entire `payroll-pwa/` directory and root `index.html` will be wiped and rebuilt from scratch
- **Company logo**: User will provide the AJK logo file (PNG or SVG) to be placed in `public/`
- **Dropdown data**: Trucking options and plow locations will be populated by admin after deployment
- **CE mapping**: Admin will define how shop/trucking/plowing entries map to CE payroll fields -- this is configurable in the admin panel, not hard-coded
- **Supabase project**: Reuse existing Supabase project (same URL + keys), but run new migration to replace all tables
- **Vercel**: Same deployment config, just pointing to the new build output
