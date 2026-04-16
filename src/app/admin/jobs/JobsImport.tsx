'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { importJobsCsv } from './actions';

export function JobsImport() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  function submit() {
    setMsg(null);
    if (!text.trim()) return;
    startTransition(async () => {
      const res = await importJobsCsv(text);
      if (res && 'error' in res) setMsg(res.error ?? 'Failed');
      else if (res) {
        const errs = res.errors ?? [];
        setMsg(
          `Imported ${res.inserted}${
            errs.length ? ` (${errs.length} errors — ${errs[0]})` : ''
          }`,
        );
        setText('');
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="job_code,description,state,local"
        className="rounded border border-slate-300 bg-white px-3 py-2 font-mono text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? 'Importing…' : 'Import'}
        </button>
        {msg && <p className="text-sm text-slate-600">{msg}</p>}
      </div>
    </div>
  );
}
