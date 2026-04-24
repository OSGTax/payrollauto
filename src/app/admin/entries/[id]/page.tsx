import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { EntryEditor } from './EntryEditor';

export default async function EntryEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [entry, jobs, classes, wcs, depts] = await Promise.all([
    supabase.from('time_entries').select('*, employees:employee_id ( emp_code, first_name, last_name )').eq('id', id).maybeSingle(),
    supabase.from('jobs').select('job_code, description').eq('active', true).order('job_code'),
    supabase.from('worker_classes').select('code, description').eq('active', true),
    supabase.from('wcomp_codes').select('code, description').eq('active', true),
    supabase.from('departments').select('code, description').eq('active', true),
  ]);
  if (!entry.data) notFound();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link href="/admin/entries" className="text-sm text-brand-ink-500 hover:underline">
        ← Entries
      </Link>
      <h1 className="mb-4 mt-2 text-xl font-semibold">Edit entry</h1>
      <EntryEditor
        entry={entry.data}
        jobs={jobs.data ?? []}
        classes={classes.data ?? []}
        wcompCodes={wcs.data ?? []}
        departments={depts.data ?? []}
      />
    </div>
  );
}
