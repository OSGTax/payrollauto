import { notFound } from 'next/navigation';
import Link from 'next/link';
import { addDays, format, subDays } from 'date-fns';
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

  // Photos uploaded on the entry's date for this employee. Pad ±1 day
  // around the local date to forgive UTC/local timezone drift.
  const entryDate = entry.data.date as string;
  const photoFrom = format(subDays(new Date(`${entryDate}T00:00:00`), 1), 'yyyy-MM-dd');
  const photoTo = format(addDays(new Date(`${entryDate}T00:00:00`), 2), 'yyyy-MM-dd');
  const { data: photos } = await supabase
    .from('entry_photos')
    .select('id, kind, caption, uploaded_at')
    .eq('employee_id', entry.data.employee_id)
    .gte('uploaded_at', `${photoFrom}T00:00:00Z`)
    .lt('uploaded_at', `${photoTo}T00:00:00Z`)
    .order('uploaded_at', { ascending: true });
  const dayPhotos = (photos ?? []).filter(
    (p) => format(new Date(p.uploaded_at), 'yyyy-MM-dd') === entryDate,
  );

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
        photos={dayPhotos}
      />
    </div>
  );
}
