import { createClient } from '@/lib/supabase/server';
import { getCurrentEmployee } from '@/lib/session';
import { ClockPanel } from './ClockPanel';
import { isoDate } from '@/lib/week';

export default async function ClockPage() {
  const emp = await getCurrentEmployee();
  if (!emp) return null;
  const supabase = await createClient();
  const today = isoDate(new Date());

  const [openEntryRes, jobsRes] = await Promise.all([
    supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', emp.id)
      .eq('date', today)
      .is('end_time', null)
      .in('status', ['draft', 'submitted'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('jobs').select('*').eq('active', true).order('job_code'),
  ]);

  return (
    <div className="mx-auto max-w-xl p-4">
      <ClockPanel
        employee={{ id: emp.id, first_name: emp.first_name }}
        openEntry={openEntryRes.data ?? null}
        jobs={jobsRes.data ?? []}
      />
    </div>
  );
}
