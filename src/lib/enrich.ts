import type { Employee, Job, TimeEntry } from './types';

/**
 * Fill in defaults from the employee + job records. Called when a worker
 * submits a clock entry so the DB row already has the full ComputerEase
 * context; admin/manager can override any field later.
 */
export function enrichEntry(
  draft: Partial<TimeEntry>,
  employee: Employee,
  job: Job | null,
  workerClassDefaults?: { default_wcomp1: string | null; default_wcomp2: string | null } | null,
): Partial<TimeEntry> {
  return {
    ...draft,
    employee_id: draft.employee_id ?? employee.id,
    class: draft.class ?? employee.default_class,
    department: draft.department ?? employee.department,
    rate: draft.rate ?? employee.default_rate,
    wcomp1:
      draft.wcomp1 ?? workerClassDefaults?.default_wcomp1 ?? employee.default_wcomp1,
    wcomp2:
      draft.wcomp2 ?? workerClassDefaults?.default_wcomp2 ?? employee.default_wcomp2,
    worktype: draft.worktype ?? job?.default_worktype ?? 1,
    type: draft.type ?? 1,
  };
}

/** Compute decimal hours between two HH:MM(:SS)? strings. Crosses midnight if needed. */
export function computeHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return Math.round((mins / 60) * 100) / 100;
}
