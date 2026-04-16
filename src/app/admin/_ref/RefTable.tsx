'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveRef, removeRef } from './actions';

export type RefRow = {
  code: string;
  description: string;
  default_wcomp1?: string | null;
  default_wcomp2?: string | null;
  active: boolean;
};

export type RefTableName = 'departments' | 'worker_classes' | 'wcomp_codes';

export function RefTable({
  title,
  table,
  rows,
  revalidateRoute,
  hasWcompDefaults,
  wcompOptions,
}: {
  title: string;
  table: RefTableName;
  rows: RefRow[];
  revalidateRoute: string;
  hasWcompDefaults?: boolean;
  wcompOptions?: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<RefRow>({ code: '', description: '', active: true });
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    if (!draft.code || !draft.description) { setError('Code and description required.'); return; }
    startTransition(async () => {
      const res = await saveRef(table, null, { ...draft, code: draft.code.toUpperCase() }, revalidateRoute);
      if (res?.error) setError(res.error);
      else {
        setDraft({ code: '', description: '', active: true });
        router.refresh();
      }
    });
  }

  function toggleActive(r: RefRow) {
    startTransition(async () => {
      await saveRef(table, r.code, { ...r, active: !r.active }, revalidateRoute);
      router.refresh();
    });
  }

  function del(code: string) {
    if (!confirm(`Delete ${code}? This will fail if any records reference it.`)) return;
    startTransition(async () => {
      const res = await removeRef(table, code, revalidateRoute);
      if (res?.error) alert(res.error);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold">{title}</h1>
      <div className="mb-4 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <input
          placeholder="Code"
          maxLength={8}
          value={draft.code}
          onChange={(e) => setDraft({ ...draft, code: e.target.value })}
          className="w-32 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <input
          placeholder="Description"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
        />
        {hasWcompDefaults && (
          <>
            <select
              value={draft.default_wcomp1 ?? ''}
              onChange={(e) => setDraft({ ...draft, default_wcomp1: e.target.value || null })}
              className="rounded border border-slate-300 px-2 py-1 text-sm"
            >
              <option value="">WC1…</option>
              {wcompOptions?.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
            <select
              value={draft.default_wcomp2 ?? ''}
              onChange={(e) => setDraft({ ...draft, default_wcomp2: e.target.value || null })}
              className="rounded border border-slate-300 px-2 py-1 text-sm"
            >
              <option value="">WC2…</option>
              {wcompOptions?.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </>
        )}
        <button onClick={add} disabled={pending} className="rounded bg-slate-900 px-3 py-1 text-sm text-white">
          + Add
        </button>
      </div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Description</th>
              {hasWcompDefaults && <>
                <th className="px-3 py-2">WC1</th>
                <th className="px-3 py-2">WC2</th>
              </>}
              <th className="px-3 py-2">Active</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((r) => (
              <tr key={r.code}>
                <td className="px-3 py-2 font-mono">{r.code}</td>
                <td className="px-3 py-2">{r.description}</td>
                {hasWcompDefaults && <>
                  <td className="px-3 py-2 font-mono text-xs">{r.default_wcomp1 ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.default_wcomp2 ?? '—'}</td>
                </>}
                <td className="px-3 py-2">
                  <button onClick={() => toggleActive(r)} className={r.active ? 'text-emerald-600' : 'text-slate-400'}>
                    {r.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => del(r.code)} className="text-xs text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
