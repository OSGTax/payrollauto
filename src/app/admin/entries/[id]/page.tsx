import { notFound } from 'next/navigation';
import Link from 'next/link';
import { addDays, subDays } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { isoDate, weekEnd, weekStart } from '@/lib/week';
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

  // Photos uploaded any time during this entry's company week (Mon–Sun)
  // for this employee. Pad ±1 day for UTC/local timezone drift.
  const entryDate = entry.data.date as string;
  const wkStart = weekStart(entryDate);
  const wkEnd = weekEnd(entryDate);
  const photoFrom = isoDate(subDays(wkStart, 1));
  const photoTo = isoDate(addDays(wkEnd, 2));
  const { data: photos } = await supabase
    .from('entry_photos')
    .select('id, kind, caption, uploaded_at')
    .eq('employee_id', entry.data.employee_id)
    .gte('uploaded_at', `${photoFrom}T00:00:00Z`)
    .lt('uploaded_at', `${photoTo}T00:00:00Z`)
    .order('uploaded_at', { ascending: true });
  const weekPhotos = (photos ?? []).filter((p) => {
    const t = new Date(p.uploaded_at).getTime();
    return t >= wkStart.getTime() && t < addDays(wkEnd, 1).getTime();
  });

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
        photos={weekPhotos}
        weekStart={isoDate(wkStart)}
        weekEnd={isoDate(wkEnd)}
      />
    </div>
  );
}
