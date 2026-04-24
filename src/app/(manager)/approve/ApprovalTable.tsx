'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveEntries, overrideEntry } from './actions';
import type { Job } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { dayOfWeekLabel } from '@/lib/week';

type Row = {
  id: string;
  employee_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  hours: number;
  type: number;
  job: string | null;
  phase: string | null;
  cat: string | null;
  class: string | null;
  status: string;
  admin_note: string | null;
  pushed_back_at: string | null;
  employees: { emp_code: string; first_name: string; last_name: string } | null;
};

type WorkerClass = { code: string; description: string };

export function ApprovalTable({
  rows,
  classes,
  jobs,
  days,
}: {
  rows: Row[];
  classes: WorkerClass[];
  jobs: Job[];
  days: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const byEmp = new Map<string, Row[]>();
  for (const r of rows) {
    const arr = byEmp.get(r.employee_id) ?? [];
    arr.push(r);
    byEmp.set(r.employee_id, arr);
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function approveSelected() {
    if (selected.size === 0) return;
    const ids = [...selected];
    startTransition(async () => {
      const res = await approveEntries(ids);
      if (!res?.error) {
        setSelected(new Set());
        router.refresh();
      }
    });
  }

  function approveWeekFor(empRows: Row[]) {
    const ids = empRows.filter((r) => r.status !== 'approved').map((r) => r.id);
    if (ids.length === 0) return;
    startTransition(async () => {
      const res = await approveEntries(ids);
      if (!res?.error) {
        setSelected((prev) => {
          const next = new Set(prev);
          ids.forEach((i) => next.delete(i));
          return next;
        });
        router.refresh();
      }
    });
  }

  const totalPending = rows.filter((r) => r.status !== 'approved').length;
  const totalApproved = rows.filter((r) => r.status === 'approved').length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-brand-ink-600">
          {selected.size} selected · {totalApproved} / {rows.length} approved
          {totalPending > 0 && ` · ${totalPending} pending`}
        </p>
        <button
          onClick={approveSelected}
          disabled={pending || selected.size === 0}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white active:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? 'Approving…' : `Approve ${selected.size}`}
        </button>
      </div>

      {[...byEmp.entries()].map(([empId, empRows]) => (
        <WorkerWeekCard
          key={empId}
          empRows={empRows}
          days={days}
          classes={classes}
          jobs={jobs}
          selected={selected}
          toggle={toggle}
          onApproveWeek={() => approveWeekFor(empRows)}
          pending={pending}
        />
      ))}
    </div>
  );
}

function WorkerWeekCard({
  empRows,
  days,
  classes,
  jobs,
  selected,
  toggle,
  onApproveWeek,
  pending,
}: {
  empRows: Row[];
  days: string[];
  classes: WorkerClass[];
  jobs: Job[];
  selected: Set<string>;
  toggle: (id: string) => void;
  onApproveWeek: () => void;
  pending: boolean;
}) {
  const employee = empRows[0].employees;
  const weekTotal = empRows.reduce((s, r) => s + Number(r.hours), 0);
  const pendingCount = empRows.filter((r) => r.status !== 'approved').length;
  const allApproved = pendingCount === 0;

  const byDay = new Map<string, Row[]>();
  for (const r of empRows) {
    const arr = byDay.get(r.date) ?? [];
    arr.push(r);
    byDay.set(r.date, arr);
  }

  return (
    <details className="rounded-xl border border-brand-ink-200 bg-white" open>
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-3">
        <div>
          <p className="font-medium">
            {employee?.first_name} {employee?.last_name}{' '}
            <span className="font-mono text-xs text-brand-ink-500">{employee?.emp_code}</span>
          </p>
          <p className="text-xs text-brand-ink-500">
            {weekTotal.toFixed(2)}h · {pendingCount} pending / {empRows.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              allApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}
          >
            {allApproved ? 'Approved' : 'Pending'}
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              onApproveWeek();
            }}
            disabled={pending || allApproved}
            className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
          >
            Approve week
          </button>
        </div>
      </summary>
      <div className="flex flex-col gap-2 px-3 pb-3">
        {days.map((d) => {
          const dayRows = byDay.get(d) ?? [];
          const dayTotal = dayRows.reduce((s, r) => s + Number(r.hours), 0);
          return (
            <div key={d} className="rounded-lg border border-brand-ink-200 bg-brand-ink-50 p-2">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-brand-ink-700">
                  {dayOfWeekLabel(d)} {format(parseISO(d), 'M/d')}
                </span>
                <span className="tabular-nums text-brand-ink-600">
                  {dayTotal > 0 ? `${dayTotal.toFixed(2)}h` : '—'}
                </span>
              </div>
              {dayRows.length === 0 ? (
                <p className="text-xs text-brand-ink-300">No entries</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {dayRows.map((r) => (
                    <EntryRow
                      key={r.id}
                      row={r}
                      classes={classes}
                      jobs={jobs}
                      selected={selected.has(r.id)}
                      onToggle={() => toggle(r.id)}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}

function EntryRow({
  row,
  classes,
  jobs,
  selected,
  onToggle,
}: {
  row: Row;
  classes: WorkerClass[];
  jobs: Job[];
  selected: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cls, setCls] = useState(row.class ?? '');
  const [job, setJob] = useState(row.job ?? '');

  function save() {
    startTransition(async () => {
      await overrideEntry({ id: row.id, class: cls || null, job: job || null });
      router.refresh();
    });
  }

  const approved = row.status === 'approved';

  return (
    <li
      className={`rounded border p-2 text-sm ${
        approved ? 'border-emerald-200 bg-emerald-50/50' : 'border-brand-ink-200 bg-white'
      } ${selected ? 'ring-2 ring-emerald-400' : ''}`}
    >
      {row.pushed_back_at && (
        <div className="mb-1 rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">
          <span className="font-medium">↩ Pushed back by admin</span>
          {row.admin_note && <span> — {row.admin_note}</span>}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="checkbox"
          checked={selected}
          disabled={approved}
          onChange={onToggle}
          className="h-5 w-5"
          aria-label="Select entry"
        />
        <span className="w-24 tabular-nums text-brand-ink-600">
          {row.start_time?.slice(0, 5) ?? '--'}–{row.end_time?.slice(0, 5) ?? '--'}
        </span>
        <span className="w-16 tabular-nums text-right font-medium">
          {Number(row.hours).toFixed(2)}h
        </span>
        <select
          value={job}
          onChange={(e) => setJob(e.target.value)}
          className="rounded border border-brand-ink-200 px-2 py-1 text-xs"
        >
          <option value="">—</option>
          {jobs.map((j) => (
            <option key={j.job_code} value={j.job_code}>{j.job_code}</option>
          ))}
        </select>
        <span className="text-xs text-brand-ink-500">{row.phase}.{row.cat}</span>
        <select
          value={cls}
          onChange={(e) => setCls(e.target.value)}
          className="rounded border border-brand-ink-200 px-2 py-1 text-xs"
        >
          <option value="">class</option>
          {classes.map((c) => (
            <option key={c.code} value={c.code}>{c.code}</option>
          ))}
        </select>
        {(cls !== (row.class ?? '') || job !== (row.job ?? '')) && (
          <button
            onClick={save}
            disabled={pending}
            className="rounded bg-brand-yellow-400 hover:bg-brand-yellow-500 px-2 py-1 text-xs text-brand-ink-900"
          >
            {pending ? '…' : 'Save'}
          </button>
        )}
        {approved && (
          <span className="ml-auto text-xs font-medium text-emerald-700">✓ Approved</span>
        )}
      </div>
    </li>
  );
}
