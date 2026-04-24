'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

type Emp = { id: string; emp_code: string; first_name: string; last_name: string };

export function EntriesFilters({
  from,
  to,
  emp,
  status,
  employees,
}: {
  from: string;
  to: string;
  emp: string;
  status: string;
  employees: Emp[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState({ from, to, emp, status });

  function apply() {
    const p = new URLSearchParams(params);
    p.set('from', state.from);
    p.set('to', state.to);
    if (state.emp) p.set('emp', state.emp); else p.delete('emp');
    if (state.status) p.set('status', state.status); else p.delete('status');
    router.push(`/admin/entries?${p.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-brand-ink-200 bg-white p-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-brand-ink-500">From</span>
        <input type="date" value={state.from} onChange={(e) => setState({ ...state, from: e.target.value })} className="rounded border border-brand-ink-200 px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-brand-ink-500">To</span>
        <input type="date" value={state.to} onChange={(e) => setState({ ...state, to: e.target.value })} className="rounded border border-brand-ink-200 px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-brand-ink-500">Employee</span>
        <select value={state.emp} onChange={(e) => setState({ ...state, emp: e.target.value })} className="rounded border border-brand-ink-200 px-2 py-1">
          <option value="">All</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.emp_code} — {e.last_name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-brand-ink-500">Status</span>
        <select value={state.status} onChange={(e) => setState({ ...state, status: e.target.value })} className="rounded border border-brand-ink-200 px-2 py-1">
          <option value="">All</option>
          <option value="draft">draft</option>
          <option value="submitted">submitted</option>
          <option value="approved">approved</option>
          <option value="locked">locked</option>
          <option value="exported">exported</option>
        </select>
      </label>
      <button onClick={apply} className="rounded-lg bg-brand-yellow-400 hover:bg-brand-yellow-500 px-3 py-2 text-brand-ink-900">Apply</button>
    </div>
  );
}
