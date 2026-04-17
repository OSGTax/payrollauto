'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { pushBackEntries } from './actions';

type Row = {
  id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  hours: number;
  type: number;
  job: string | null;
  phase: string | null;
  cat: string | null;
  class: string | null;
  department: string | null;
  wcomp1: string | null;
  status: string;
  admin_note: string | null;
  pushed_back_at: string | null;
  employees: { emp_code: string; first_name: string; last_name: string } | null;
};

export function EntriesTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');

  const approvedIds = rows.filter((r) => r.status === 'approved').map((r) => r.id);
  const allApprovedSelected =
    approvedIds.length > 0 && approvedIds.every((id) => selected.has(id));

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (allApprovedSelected) setSelected(new Set());
    else setSelected(new Set(approvedIds));
  }

  function pushBack() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Push ${selected.size} entr${selected.size === 1 ? 'y' : 'ies'} back to manager? They'll return to "submitted" for re-review.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await pushBackEntries([...selected], note);
      if (res?.error) alert(res.error);
      else {
        setSelected(new Set());
        setNote('');
        router.refresh();
      }
    });
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <input
            type="text"
            placeholder="Note for manager (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex-1 min-w-[200px] rounded border border-slate-300 bg-white px-2 py-1"
          />
          <button
            onClick={pushBack}
            disabled={pending}
            className="rounded bg-amber-600 px-3 py-1 font-medium text-white disabled:opacity-50"
          >
            {pending ? 'Pushing…' : 'Push back to manager'}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-slate-600 hover:underline"
          >
            Clear
          </button>
        </div>
      )}
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left uppercase text-slate-500">
            <tr>
              <th className="w-8 px-2 py-2">
                <input
                  type="checkbox"
                  checked={allApprovedSelected}
                  disabled={approvedIds.length === 0}
                  onChange={toggleAll}
                  aria-label="Select all approved"
                />
              </th>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Emp</th>
              <th className="px-2 py-2">Time</th>
              <th className="px-2 py-2">Hrs</th>
              <th className="px-2 py-2">T</th>
              <th className="px-2 py-2">Job.Ph.Cat</th>
              <th className="px-2 py-2">Class</th>
              <th className="px-2 py-2">Dept</th>
              <th className="px-2 py-2">WC</th>
              <th className="px-2 py-2">Status</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((r) => {
              const canSelect = r.status === 'approved';
              return (
                <tr
                  key={r.id}
                  className={selected.has(r.id) ? 'bg-amber-50' : undefined}
                >
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      disabled={!canSelect}
                      onChange={() => toggle(r.id)}
                      aria-label={`Select entry ${r.id}`}
                    />
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">
                    {format(parseISO(r.date), 'M/d')}
                  </td>
                  <td className="px-2 py-1.5 font-mono">
                    {r.employees?.emp_code}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">
                    {r.start_time?.slice(0, 5) ?? '--'}–
                    {r.end_time?.slice(0, 5) ?? '--'}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">
                    {Number(r.hours).toFixed(2)}
                  </td>
                  <td className="px-2 py-1.5">{r.type}</td>
                  <td className="px-2 py-1.5 font-mono">
                    {[r.job, r.phase, r.cat].filter(Boolean).join('.')}
                  </td>
                  <td className="px-2 py-1.5 font-mono">{r.class ?? ''}</td>
                  <td className="px-2 py-1.5 font-mono">
                    {r.department ?? ''}
                  </td>
                  <td className="px-2 py-1.5 font-mono">{r.wcomp1 ?? ''}</td>
                  <td className="px-2 py-1.5">
                    <span
                      className={
                        r.status === 'approved'
                          ? 'text-emerald-600'
                          : r.status === 'exported'
                          ? 'text-slate-400'
                          : 'text-slate-900'
                      }
                    >
                      {r.status}
                    </span>
                    {r.pushed_back_at && (
                      <span
                        className="ml-1 text-amber-600"
                        title={
                          r.admin_note
                            ? `Pushed back: ${r.admin_note}`
                            : 'Pushed back by admin'
                        }
                      >
                        ↩
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <Link
                      href={`/admin/entries/${r.id}`}
                      className="text-slate-600 hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
