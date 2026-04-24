'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveEmployee } from './actions';
import type { Employee, Role } from '@/lib/types';

type Opt = { code: string; description: string };

export function EmployeeForm({
  employee,
  departments,
  classes,
  wcompCodes,
}: {
  employee?: Employee;
  departments: Opt[];
  classes: Opt[];
  wcompCodes: Opt[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(form: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await saveEmployee(employee?.id ?? null, form);
      if (res?.error) setError(res.error);
      else router.push('/admin/employees');
    });
  }

  const e = employee;
  return (
    <form action={onSubmit} className="flex flex-col gap-3">
      <Field label="Employee code (login)">
        <input name="emp_code" defaultValue={e?.emp_code ?? ''} required maxLength={8} autoCapitalize="characters" className={inp} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <input name="first_name" defaultValue={e?.first_name ?? ''} required className={inp} />
        </Field>
        <Field label="Last name">
          <input name="last_name" defaultValue={e?.last_name ?? ''} required className={inp} />
        </Field>
      </div>
      <Field label="Role">
        <select name="role" defaultValue={e?.role ?? 'worker'} className={inp}>
          {(['worker','manager','admin'] as Role[]).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="Department">
        <select name="department" defaultValue={e?.department ?? ''} className={inp}>
          <option value="">—</option>
          {departments.map(d => <option key={d.code} value={d.code}>{d.code} — {d.description}</option>)}
        </select>
      </Field>
      <Field label="Default worker class">
        <select name="default_class" defaultValue={e?.default_class ?? ''} className={inp}>
          <option value="">—</option>
          {classes.map(c => <option key={c.code} value={c.code}>{c.code} — {c.description}</option>)}
        </select>
      </Field>
      <Field label="Default hourly rate">
        <input name="default_rate" type="number" step="0.0001" defaultValue={e?.default_rate ?? ''} className={inp} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Default WC1">
          <select name="default_wcomp1" defaultValue={e?.default_wcomp1 ?? ''} className={inp}>
            <option value="">—</option>
            {wcompCodes.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </Field>
        <Field label="Default WC2">
          <select name="default_wcomp2" defaultValue={e?.default_wcomp2 ?? ''} className={inp}>
            <option value="">—</option>
            {wcompCodes.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </Field>
      </div>
      {!employee && (
        <Field label="Initial password">
          <input name="password" type="text" required minLength={8} className={inp} />
        </Field>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={e?.active ?? true} /> Active
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={pending} className="mt-2 rounded-lg bg-brand-yellow-400 hover:bg-brand-yellow-500 px-4 py-2 font-medium text-brand-ink-900 disabled:opacity-50">
        {pending ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}

const inp =
  'w-full rounded-lg border border-brand-ink-200 bg-white px-3 py-2 text-base focus:border-brand-ink-900 focus:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-brand-ink-600">{label}</span>
      {children}
    </label>
  );
}
