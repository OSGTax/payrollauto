import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/session';
import { isoDate, isoWeekStart, weekDays } from '@/lib/week';
import { ApprovalTable } from './ApprovalTable';
import { WeekNav } from './WeekNav';
import { parseISO } from 'date-fns';

export default async function ApprovePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  await requireRole(['manager', 'admin']);
  const supabase = await createClient();
  const { week } = await searchParams;
  const anchor = week ? parseISO(week) : new Date();
  const start = isoWeekStart(anchor);
  const days = weekDays(anchor).map(isoDate);

  const { data: rawRows } = await supabase
    .from('time_entries')
    .select(`
      id, employee_id, date, start_time, end_time, hours, type,
      job, phase, cat, class, status, admin_note, pushed_back_at,
      employees:employee_id ( id, emp_code, first_name, last_name, role )
    `)
    .gte('date', days[0])
    .lte('date', days[6])
    .order('date')
    .order('start_time');

  const rows = (rawRows ?? []).map((r) => ({
    ...r,
    employees: Array.isArray(r.employees) ? r.employees[0] ?? null : r.employees,
  }));

  const { data: classes } = await supabase
    .from('worker_classes')
    .select('code, description')
    .eq('active', true);

  const { data: jobs } = await supabase.from('jobs').select('*').eq('active', true);

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-3 text-xl font-semibold">Approve</h1>
      <WeekNav anchorIso={start} />
      <ApprovalTable rows={rows} classes={classes ?? []} jobs={jobs ?? []} days={days} />
    </div>
  );
}
