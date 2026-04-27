import { createClient } from '@/lib/supabase/server';
import { isoDate, isoWeekStart, weekDays, weekEnd, weekStart } from '@/lib/week';
import { addDays, subDays } from 'date-fns';
import { EntriesFilters } from './EntriesFilters';
import { EntriesTable } from './EntriesTable';

type PhotoRow = {
  id: string;
  employee_id: string;
  kind: 'job' | 'receipt';
  caption: string | null;
  uploaded_at: string;
};

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

  const employeeIds = Array.from(new Set(normalized.map((r) => r.employee_id)));
  const photosByWeek = new Map<string, PhotoRow[]>();
  if (employeeIds.length) {
    // Photos are matched to the company week (Mon–Sun). Widen the fetch to
    // cover whole weeks plus ±1 day for UTC/local drift on `uploaded_at`.
    const photoFrom = isoDate(subDays(weekStart(from), 1));
    const photoTo = isoDate(addDays(weekEnd(to), 2));
    const { data: photos } = await supabase
      .from('entry_photos')
      .select('id, employee_id, kind, caption, uploaded_at')
      .in('employee_id', employeeIds)
      .gte('uploaded_at', `${photoFrom}T00:00:00Z`)
      .lt('uploaded_at', `${photoTo}T00:00:00Z`)
      .order('uploaded_at', { ascending: true });
    for (const p of (photos ?? []) as PhotoRow[]) {
      const wk = isoWeekStart(new Date(p.uploaded_at));
      const key = `${p.employee_id}|${wk}`;
      const list = photosByWeek.get(key) ?? [];
      list.push(p);
      photosByWeek.set(key, list);
    }
  }

  const rowsWithPhotos = normalized.map((r) => ({
    ...r,
    photos:
      photosByWeek.get(`${r.employee_id}|${isoWeekStart(r.date)}`)?.map((p) => ({
        id: p.id,
        kind: p.kind,
        caption: p.caption,
      })) ?? [],
  }));

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
      <EntriesTable rows={rowsWithPhotos} />
    </div>
  );
}
