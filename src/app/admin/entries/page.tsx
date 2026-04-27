import { createClient } from '@/lib/supabase/server';
import { isoDate, weekDays } from '@/lib/week';
import { addDays, format, subDays } from 'date-fns';
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
  const photosByDay = new Map<string, PhotoRow[]>();
  if (employeeIds.length) {
    // Pad ±1 day to forgive timezone drift between UTC `uploaded_at` and the
    // local `date` on time_entries.
    const photoFrom = isoDate(subDays(new Date(`${from}T00:00:00`), 1));
    const photoTo = isoDate(addDays(new Date(`${to}T00:00:00`), 2));
    const { data: photos } = await supabase
      .from('entry_photos')
      .select('id, employee_id, kind, caption, uploaded_at')
      .in('employee_id', employeeIds)
      .gte('uploaded_at', `${photoFrom}T00:00:00Z`)
      .lt('uploaded_at', `${photoTo}T00:00:00Z`)
      .order('uploaded_at', { ascending: true });
    for (const p of (photos ?? []) as PhotoRow[]) {
      const day = format(new Date(p.uploaded_at), 'yyyy-MM-dd');
      const key = `${p.employee_id}|${day}`;
      const list = photosByDay.get(key) ?? [];
      list.push(p);
      photosByDay.set(key, list);
    }
  }

  const rowsWithPhotos = normalized.map((r) => ({
    ...r,
    photos:
      photosByDay.get(`${r.employee_id}|${r.date}`)?.map((p) => ({
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
