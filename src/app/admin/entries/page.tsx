import { createClient } from '@/lib/supabase/server';
import { isoDate, weekDays } from '@/lib/week';
import { subDays } from 'date-fns';
import { EntriesFilters } from './EntriesFilters';
import { EntriesTable } from './EntriesTable';

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
      status, notes, admin_note, pushed_back_at,
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

  const normalized = (rows ?? []).map((r) => {
    const eRaw = r.employees as
      | { emp_code: string; first_name: string; last_name: string }
      | Array<{ emp_code: string; first_name: string; last_name: string }>
      | null;
    const employees = Array.isArray(eRaw) ? eRaw[0] ?? null : eRaw;
    return { ...r, employees };
  });

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
      <EntriesTable rows={normalized} />
    </div>
  );
}
