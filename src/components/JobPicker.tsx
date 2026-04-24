'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Job, Phase, Category } from '@/lib/types';

type Value = { job: string | null; phase: string | null; cat: string | null };

export function JobPicker({
  jobs,
  value,
  onChange,
}: {
  jobs: Job[];
  value: Value;
  onChange: (v: Value) => void;
}) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!value.job) { setPhases([]); return; }
    supabase
      .from('phases')
      .select('*')
      .eq('job_code', value.job)
      .eq('active', true)
      .order('phase_code')
      .then(({ data }) => setPhases(data ?? []));
  }, [value.job, supabase]);

  useEffect(() => {
    if (!value.job || !value.phase) { setCats([]); return; }
    supabase
      .from('categories')
      .select('*')
      .eq('job_code', value.job)
      .eq('phase_code', value.phase)
      .eq('active', true)
      .order('cat_code')
      .then(({ data }) => setCats(data ?? []));
  }, [value.job, value.phase, supabase]);

  const selectCls =
    'w-full rounded-lg border border-brand-ink-200 bg-white px-3 py-2 text-base focus:border-brand-ink-900 focus:outline-none';

  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 text-left">
        <span className="text-xs font-medium text-brand-ink-600">Job</span>
        <select
          className={selectCls}
          value={value.job ?? ''}
          onChange={(e) => onChange({ job: e.target.value || null, phase: null, cat: null })}
        >
          <option value="">Select job…</option>
          {jobs.map((j) => (
            <option key={j.job_code} value={j.job_code}>
              {j.job_code} — {j.description}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-left">
        <span className="text-xs font-medium text-brand-ink-600">Phase</span>
        <select
          className={selectCls}
          value={value.phase ?? ''}
          onChange={(e) => onChange({ ...value, phase: e.target.value || null, cat: null })}
          disabled={!value.job}
        >
          <option value="">Select phase…</option>
          {phases.map((p) => (
            <option key={p.phase_code} value={p.phase_code}>
              {p.phase_code} — {p.description}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-left">
        <span className="text-xs font-medium text-brand-ink-600">Category</span>
        <select
          className={selectCls}
          value={value.cat ?? ''}
          onChange={(e) => onChange({ ...value, cat: e.target.value || null })}
          disabled={!value.phase}
        >
          <option value="">Select category…</option>
          {cats.map((c) => (
            <option key={c.cat_code} value={c.cat_code}>
              {c.cat_code} — {c.description}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
