'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveEntries, overrideEntry } from './actions';
import type { Job } from '@/lib/types';
import { format, parseISO } from 'date-fns';

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

export function ApprovalTable({
  rows,
  classes,
  jobs,
}: {
  rows: Row[];
  classes: { code: string; description: string }[];
  jobs: Job[];
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

  function toggleEmp(empId: string, checked: boolean) {
    const next = new Set(selected);
    const ids = (byEmp.get(empId) ?? []).filter((r) => r.status !== 'approved').map((r) => r.id);
    if (checked) ids.forEach((i) => next.add(i));
    else ids.forEach((i) => next.delete(i));
    setSelected(next);
  }

  function approveAll() {
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {selected.size} selected · {rows.filter((r) => r.status === 'approved').length} /{' '}
          {rows.length} approved
        </p>
        <button
          onClick={approveAll}
          disabled={pending || selected.size === 0}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white active:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? 'Approving…' : `Approve ${selected.size}`}
        </button>
      </div>

      {[...byEmp.entries()].map(([empId, empRows]) => {
        const employee = empRows[0].employees;
        const total = empRows.reduce((s, r) => s + Number(r.hours), 0);
        const allApproved = empRows.every((r) => r.status === 'approved');
        return (
          <details key={empId} className="rounded-xl border border-slate-200 bg-white" open>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  disabled={allApproved}
                  onChange={(e) => toggleEmp(empId, e.target.checked)}
                  className="h-5 w-5"
                />
                <div>
                  <p className="font-medium">
                    {employee?.first_name} {employee?.last_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {employee?.emp_code} · {total.toFixed(2)}h
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  allApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {allApproved ? 'Approved' : 'Pending'}
              </span>
            </summary>
            <ul className="divide-y divide-slate-200 px-3 pb-3">
              {empRows.map((r) => (
                <EntryRow key={r.id} row={r} classes={classes} jobs={jobs} />
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

function EntryRow({
  row,
  classes,
  jobs,
}: {
  row: Row;
  classes: { code: string; description: string }[];
  jobs: Job[];
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

  return (
    <li className={`flex flex-wrap items-center gap-2 py-2 text-sm ${row.pushed_back_at ? 'bg-amber-50 -mx-3 px-3' : ''}`}>
      {row.pushed_back_at && (
        <div className="w-full text-xs text-amber-700">
          <span className="font-medium">↩ Pushed back by admin</span>
          {row.admin_note && <span className="ml-1">— {row.admin_note}</span>}
        </div>
      )}
      <span className="w-20 tabular-nums text-slate-600">
        {format(parseISO(row.date), 'EEE M/d')}
      </span>
      <span className="w-28 tabular-nums">
        {row.start_time?.slice(0, 5) ?? '--'}–{row.end_time?.slice(0, 5) ?? '--'}
      </span>
      <span className="w-14 tabular-nums text-right">{Number(row.hours).toFixed(2)}h</span>
      <select value={job} onChange={(e) => setJob(e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-xs">
        <option value="">—</option>
        {jobs.map((j) => (
          <option key={j.job_code} value={j.job_code}>{j.job_code}</option>
        ))}
      </select>
      <span className="text-xs text-slate-500">{row.phase}.{row.cat}</span>
      <select value={cls} onChange={(e) => setCls(e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-xs">
        <option value="">class</option>
        {classes.map((c) => (
          <option key={c.code} value={c.code}>{c.code}</option>
        ))}
      </select>
      {(cls !== (row.class ?? '') || job !== (row.job ?? '')) && (
        <button onClick={save} disabled={pending} className="rounded bg-slate-900 px-2 py-1 text-xs text-white">
          {pending ? '…' : 'Save'}
        </button>
      )}
    </li>
  );
}
