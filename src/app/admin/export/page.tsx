import { createClient } from '@/lib/supabase/server';
import { isoDate, weekDays } from '@/lib/week';
import { subDays } from 'date-fns';
import { ExportForm } from './ExportForm';

export default async function ExportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const defaultTo = isoDate(new Date());
  const defaultFrom = isoDate(weekDays(subDays(new Date(), 7))[0]);
  const from = sp.from ?? defaultFrom;
  const to = sp.to ?? defaultTo;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('time_entries')
    .select(`
      id, date, start_time, end_time, hours, type, status,
      job, phase, cat, class, department, wcomp1, wcomp2, rate,
      employees:employee_id ( emp_code, first_name, last_name )
    `)
    .gte('date', from)
    .lte('date', to)
    .order('date')
    .order('start_time');

  const missing = (rows ?? []).filter(
    (r) => !r.class || !r.department || !r.wcomp1 || (r.type === 1 && (!r.job || !r.phase || !r.cat)),
  );
  const approved = (rows ?? []).filter((r) => r.status === 'approved').length;
  const submitted = (rows ?? []).filter((r) => r.status === 'submitted').length;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Export payroll</h1>
      <ExportForm from={from} to={to} />
      <section className="mt-6 rounded-lg border border-brand-ink-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Preflight</h2>
        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <Stat label="Rows in range" value={rows?.length ?? 0} />
          <Stat label="Approved" value={approved} />
          <Stat label="Submitted" value={submitted} />
          <Stat label="Missing fields" value={missing.length} tone={missing.length > 0 ? 'warn' : 'ok'} />
        </ul>
        {missing.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-brand-ink-600">
              Show {missing.length} rows missing required fields
            </summary>
            <ul className="mt-2 flex flex-col gap-1 text-xs">
              {missing.slice(0, 50).map((r) => {
                const eRaw = r.employees as
                  | { emp_code: string }
                  | Array<{ emp_code: string }>
                  | null;
                const e = Array.isArray(eRaw) ? eRaw[0] ?? null : eRaw;
                return (
                  <li key={r.id} className="text-brand-ink-600">
                    {r.date} · {e?.emp_code} ·{' '}
                    {[!r.class && 'class', !r.department && 'dept', !r.wcomp1 && 'wc1',
                      r.type === 1 && (!r.job || !r.phase || !r.cat) && 'job.phase.cat']
                      .filter(Boolean)
                      .join(', ')}
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'warn' | 'ok' }) {
  const color = tone === 'warn' ? 'text-amber-600' : tone === 'ok' ? 'text-emerald-600' : '';
  return (
    <li className="rounded border border-brand-ink-200 p-2">
      <p className="text-xs text-brand-ink-500">{label}</p>
      <p className={`text-xl font-semibold ${color}`}>{value}</p>
    </li>
  );
}
