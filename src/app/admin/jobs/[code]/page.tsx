import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { JobForm } from '../JobForm';
import { PhasesCatsEditor } from './PhasesCatsEditor';

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createClient();
  const [job, phases, cats] = await Promise.all([
    supabase.from('jobs').select('*').eq('job_code', code).maybeSingle(),
    supabase.from('phases').select('*').eq('job_code', code).order('phase_code'),
    supabase.from('categories').select('*').eq('job_code', code).order('phase_code').order('cat_code'),
  ]);
  if (!job.data) notFound();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link href="/admin/jobs" className="text-sm text-brand-ink-500 hover:underline">← Jobs</Link>
      <h1 className="mb-4 mt-2 text-xl font-semibold">
        Job {job.data.job_code} — {job.data.description}
      </h1>
      <JobForm job={job.data} />
      <PhasesCatsEditor job={code} phases={phases.data ?? []} cats={cats.data ?? []} />
    </div>
  );
}
