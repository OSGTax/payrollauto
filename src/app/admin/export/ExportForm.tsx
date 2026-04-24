'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function ExportForm({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState({ from, to, format: 'comma', onlyApproved: true, markExported: true });

  function apply() {
    const p = new URLSearchParams(params);
    p.set('from', state.from);
    p.set('to', state.to);
    router.push(`/admin/export?${p.toString()}`);
  }

  const downloadUrl = `/api/export?${new URLSearchParams({
    from: state.from,
    to: state.to,
    format: state.format,
    onlyApproved: String(state.onlyApproved),
    markExported: String(state.markExported),
  }).toString()}`;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-brand-ink-200 bg-white p-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-brand-ink-500">From</span>
        <input type="date" value={state.from} onChange={(e) => setState({ ...state, from: e.target.value })} className="rounded border border-brand-ink-200 px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-brand-ink-500">To</span>
        <input type="date" value={state.to} onChange={(e) => setState({ ...state, to: e.target.value })} className="rounded border border-brand-ink-200 px-2 py-1" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-brand-ink-500">Format</span>
        <select value={state.format} onChange={(e) => setState({ ...state, format: e.target.value })} className="rounded border border-brand-ink-200 px-2 py-1">
          <option value="comma">CSV (comma)</option>
          <option value="tab">TSV (tab)</option>
          <option value="fixed">Fixed-width</option>
        </select>
      </label>
      <label className="flex items-center gap-1 text-sm">
        <input type="checkbox" checked={state.onlyApproved} onChange={(e) => setState({ ...state, onlyApproved: e.target.checked })} />
        Only approved
      </label>
      <label className="flex items-center gap-1 text-sm">
        <input type="checkbox" checked={state.markExported} onChange={(e) => setState({ ...state, markExported: e.target.checked })} />
        Mark exported
      </label>
      <button type="button" onClick={apply} className="rounded-lg border border-brand-ink-200 px-3 py-2 text-sm">
        Preview
      </button>
      <a
        href={downloadUrl}
        className="rounded-lg bg-brand-yellow-400 hover:bg-brand-yellow-500 px-4 py-2 text-sm font-medium text-brand-ink-900"
      >
        Download
      </a>
    </div>
  );
}
