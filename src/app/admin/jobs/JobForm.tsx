'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveJob } from './actions';
import type { Job } from '@/lib/types';

export function JobForm({ job }: { job?: Job }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(form: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await saveJob(job?.job_code ?? null, form);
      if (res?.error) setError(res.error);
      else router.push('/admin/jobs');
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <Field label="Job code (max 10)">
        <input name="job_code" defaultValue={job?.job_code ?? ''} required maxLength={10} readOnly={!!job} className={inp} />
      </Field>
      <Field label="Description">
        <input name="description" defaultValue={job?.description ?? ''} required className={inp} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="State">
          <input name="state" defaultValue={job?.state ?? ''} maxLength={2} className={inp} />
        </Field>
        <Field label="Local (taxing authority)">
          <input name="local" defaultValue={job?.local ?? ''} maxLength={8} className={inp} />
        </Field>
      </div>
      <Field label="Default worktype">
        <select name="default_worktype" defaultValue={job?.default_worktype ?? 1} className={inp}>
          <option value={1}>1 — Job</option>
          <option value={2}>2 — Shop</option>
          <option value={3}>3 — Travel</option>
        </select>
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={job?.active ?? true} /> Active
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={pending} className="mt-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-50">
        {pending ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}

const inp =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base focus:border-slate-900 focus:outline-none read-only:bg-slate-50';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
