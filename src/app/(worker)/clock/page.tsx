import { createClient } from '@/lib/supabase/server';
import { getCurrentEmployee } from '@/lib/session';
import { ClockPanel } from './ClockPanel';
import { easternDate } from '@/lib/tz';

export default async function ClockPage() {
  const emp = await getCurrentEmployee();
  if (!emp) return null;
  const supabase = await createClient();
  const today = easternDate();

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

  const openEntry = openEntryRes.data ?? null;
  let openEntryDetail: OpenEntryDetail | null = null;

  if (openEntry && openEntry.job && openEntry.phase && openEntry.cat) {
    const [jobRes, phaseRes, catRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('job_code, description, state, local, default_worktype')
        .eq('job_code', openEntry.job)
        .maybeSingle(),
      supabase
        .from('phases')
        .select('description')
        .eq('job_code', openEntry.job)
        .eq('phase_code', openEntry.phase)
        .maybeSingle(),
      supabase
        .from('categories')
        .select('description')
        .eq('job_code', openEntry.job)
        .eq('phase_code', openEntry.phase)
        .eq('cat_code', openEntry.cat)
        .maybeSingle(),
    ]);
    openEntryDetail = {
      job: jobRes.data ?? null,
      phaseDescription: phaseRes.data?.description ?? null,
      catDescription: catRes.data?.description ?? null,
    };
  }

  return (
    <div className="mx-auto max-w-xl p-4">
      <ClockPanel
        employee={{ id: emp.id, first_name: emp.first_name }}
        openEntry={openEntry}
        openEntryDetail={openEntryDetail}
        jobs={jobsRes.data ?? []}
      />
    </div>
  );
}

export type OpenEntryDetail = {
  job: {
    job_code: string;
    description: string;
    state: string | null;
    local: string | null;
    default_worktype: number;
  } | null;
  phaseDescription: string | null;
  catDescription: string | null;
};
