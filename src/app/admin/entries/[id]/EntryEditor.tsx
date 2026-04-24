'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveEntry, deleteEntry } from './actions';
import type { TimeEntry } from '@/lib/types';

type Opt = { code: string; description: string };
type EntryWithEmp = TimeEntry & {
  employees: { emp_code: string; first_name: string; last_name: string } | null;
};

export function EntryEditor({
  entry,
  jobs,
  classes,
  wcompCodes,
  departments,
}: {
  entry: EntryWithEmp;
  jobs: { job_code: string; description: string }[];
  classes: Opt[];
  wcompCodes: Opt[];
  departments: Opt[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: entry.date,
    start_time: entry.start_time ?? '',
    end_time: entry.end_time ?? '',
    hours: entry.hours,
    type: entry.type,
    otmult: entry.otmult ?? '',
    job: entry.job ?? '',
    phase: entry.phase ?? '',
    cat: entry.cat ?? '',
    class: entry.class ?? '',
    department: entry.department ?? '',
    worktype: entry.worktype ?? 1,
    wcomp1: entry.wcomp1 ?? '',
    wcomp2: entry.wcomp2 ?? '',
    rate: entry.rate ?? '',
    notes: entry.notes ?? '',
    status: entry.status,
  });

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await saveEntry(entry.id, {
        ...form,
        otmult: form.otmult === '' ? null : Number(form.otmult),
        rate: form.rate === '' ? null : Number(form.rate),
        hours: Number(form.hours),
        start_time: form.start_time || null,
        end_time: form.end_time || null,
      });
      if (res?.error) setError(res.error);
      else router.push('/admin/entries');
    });
  }

  function del() {
    if (!confirm('Delete this entry?')) return;
    startTransition(async () => {
      const res = await deleteEntry(entry.id);
      if (res?.error) setError(res.error);
      else router.push('/admin/entries');
    });
  }

  const emp = entry.employees;

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      className="flex flex-col gap-3 rounded-lg border border-brand-ink-200 bg-white p-4"
    >
      <p className="text-sm text-brand-ink-600">
        {emp?.emp_code} — {emp?.first_name} {emp?.last_name}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Date"><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inp} /></Field>
        <Field label="Start"><input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className={inp} /></Field>
        <Field label="End"><input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className={inp} /></Field>
        <Field label="Hours"><input type="number" step="0.01" value={form.hours} onChange={e => setForm({ ...form, hours: Number(e.target.value) })} className={inp} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Type">
          <select value={form.type} onChange={e => setForm({ ...form, type: Number(e.target.value) })} className={inp}>
            <option value={1}>1 Reg</option>
            <option value={2}>2 OT</option>
            <option value={3}>3 Dbl</option>
            <option value={4}>4 Sick</option>
            <option value={5}>5 Vac</option>
            <option value={6}>6 Hol</option>
          </select>
        </Field>
        <Field label="OT mult">
          <input type="number" step="0.01" value={form.otmult} onChange={e => setForm({ ...form, otmult: e.target.value })} className={inp} />
        </Field>
        <Field label="Worktype">
          <select value={form.worktype} onChange={e => setForm({ ...form, worktype: Number(e.target.value) })} className={inp}>
            <option value={1}>1 Job</option>
            <option value={2}>2 Shop</option>
            <option value={3}>3 Travel</option>
          </select>
        </Field>
        <Field label="Rate">
          <input type="number" step="0.0001" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} className={inp} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Job">
          <select value={form.job} onChange={e => setForm({ ...form, job: e.target.value, phase: '', cat: '' })} className={inp}>
            <option value="">—</option>
            {jobs.map(j => <option key={j.job_code} value={j.job_code}>{j.job_code}</option>)}
          </select>
        </Field>
        <Field label="Phase"><input value={form.phase} onChange={e => setForm({ ...form, phase: e.target.value })} className={inp} /></Field>
        <Field label="Cat"><input value={form.cat} onChange={e => setForm({ ...form, cat: e.target.value })} className={inp} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Class">
          <select value={form.class} onChange={e => setForm({ ...form, class: e.target.value })} className={inp}>
            <option value="">—</option>
            {classes.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </Field>
        <Field label="Department">
          <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className={inp}>
            <option value="">—</option>
            {departments.map(d => <option key={d.code} value={d.code}>{d.code}</option>)}
          </select>
        </Field>
        <Field label="WC1">
          <select value={form.wcomp1} onChange={e => setForm({ ...form, wcomp1: e.target.value })} className={inp}>
            <option value="">—</option>
            {wcompCodes.map(w => <option key={w.code} value={w.code}>{w.code}</option>)}
          </select>
        </Field>
        <Field label="WC2">
          <select value={form.wcomp2} onChange={e => setForm({ ...form, wcomp2: e.target.value })} className={inp}>
            <option value="">—</option>
            {wcompCodes.map(w => <option key={w.code} value={w.code}>{w.code}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Notes"><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={inp} /></Field>
      <Field label="Status">
        <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as typeof form.status })} className={inp}>
          <option value="draft">draft</option>
          <option value="submitted">submitted</option>
          <option value="approved">approved</option>
          <option value="locked">locked</option>
          <option value="exported">exported</option>
        </select>
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-between">
        <button type="button" onClick={del} disabled={pending} className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 disabled:opacity-50">
          Delete entry
        </button>
        <button disabled={pending} className="rounded-lg bg-brand-yellow-400 hover:bg-brand-yellow-500 px-4 py-2 font-medium text-brand-ink-900 disabled:opacity-50">
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}

const inp =
  'w-full rounded-lg border border-brand-ink-200 bg-white px-2 py-1.5 text-sm focus:border-brand-ink-900 focus:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-brand-ink-600">{label}</span>
      {children}
    </label>
  );
}
