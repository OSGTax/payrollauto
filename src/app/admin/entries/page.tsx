import { createClient } from '@/lib/supabase/server';
import { isoDate, weekDays } from '@/lib/week';
import Link from 'next/link';
import { format, parseISO, subDays } from 'date-fns';
import { EntriesFilters } from './EntriesFilters';

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; emp?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const defaultFrom = isoDate(weekDays(subDays(new Date(), 7))[0]);
  const defaultTo = isoDate(weekDays(new Date())[6]);
  const from = sp.from ?? defaultFrom;
  const to = sp.to ?? defaultTo;

  let q = supabase
    .from('time_entries')
    .select(`
      id, employee_id, date, start_time, end_time, hours, type, otmult,
      job, phase, cat, class, department, worktype, wcomp1, wcomp2, rate,
      status, notes,
      employees:employee_id ( emp_code, first_name, last_name )
    `)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false });
  if (sp.emp) q = q.eq('employee_id', sp.emp);
  if (sp.status) q = q.eq('status', sp.status);
  const { data: rows } = await q;

  const { data: emps } = await supabase
    .from('employees')
    .select('id, emp_code, first_name, last_name')
    .eq('active', true)
    .order('last_name');

  return (
    <div className="mx-auto max-w-7xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Time entries</h1>
      <EntriesFilters
        from={from}
        to={to}
        emp={sp.emp ?? ''}
        status={sp.status ?? ''}
        employees={emps ?? []}
      />
      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left uppercase text-slate-500">
            <tr>
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
            {rows?.map((r) => {
              const eRaw = r.employees as
                | { emp_code: string; first_name: string; last_name: string }
                | Array<{ emp_code: string; first_name: string; last_name: string }>
                | null;
              const e = Array.isArray(eRaw) ? eRaw[0] ?? null : eRaw;
              return (
                <tr key={r.id}>
                  <td className="px-2 py-1.5 tabular-nums">{format(parseISO(r.date), 'M/d')}</td>
                  <td className="px-2 py-1.5 font-mono">{e?.emp_code}</td>
                  <td className="px-2 py-1.5 tabular-nums">
                    {r.start_time?.slice(0, 5) ?? '--'}–{r.end_time?.slice(0, 5) ?? '--'}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums">{Number(r.hours).toFixed(2)}</td>
                  <td className="px-2 py-1.5">{r.type}</td>
                  <td className="px-2 py-1.5 font-mono">
                    {[r.job, r.phase, r.cat].filter(Boolean).join('.')}
                  </td>
                  <td className="px-2 py-1.5 font-mono">{r.class ?? ''}</td>
                  <td className="px-2 py-1.5 font-mono">{r.department ?? ''}</td>
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
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <Link href={`/admin/entries/${r.id}`} className="text-slate-600 hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
