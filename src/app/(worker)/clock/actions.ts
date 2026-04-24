'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentEmployee } from '@/lib/session';
import { enrichEntry, computeHours } from '@/lib/enrich';
import { easternDateTime } from '@/lib/tz';

export async function clockIn(input: {
  job: string;
  phase: string;
  cat: string;
  lat: number | null;
  lng: number | null;
}) {
  const emp = await getCurrentEmployee();
  if (!emp) return { error: 'Not signed in.' };
  const supabase = await createClient();

  const { data: job } = await supabase
    .from('jobs')
    .select('*')
    .eq('job_code', input.job)
    .maybeSingle();

  const { data: wc } = emp.default_class
    ? await supabase
        .from('worker_classes')
        .select('default_wcomp1, default_wcomp2')
        .eq('code', emp.default_class)
        .maybeSingle()
    : { data: null };

  const { date, time } = easternDateTime();
  const enriched = enrichEntry(
    {
      date,
      start_time: time,
      hours: 0,
      type: 1,
      job: input.job,
      phase: input.phase,
      cat: input.cat,
      clock_in_lat: input.lat,
      clock_in_lng: input.lng,
      status: 'draft',
      created_by: emp.id,
    },
    emp,
    job,
    wc,
  );

  const { error } = await supabase.from('time_entries').insert(enriched);
  if (error) return { error: error.message };
  revalidatePath('/clock');
  revalidatePath('/week');
  return { ok: true };
}

export async function clockOut(input: {
  entryId: string;
  lat: number | null;
  lng: number | null;
}) {
  const emp = await getCurrentEmployee();
  if (!emp) return { error: 'Not signed in.' };
  const supabase = await createClient();

  const { data: entry } = await supabase
    .from('time_entries')
    .select('*')
    .eq('id', input.entryId)
    .maybeSingle();
  if (!entry) return { error: 'Entry not found.' };

  const now = new Date();
  const { time: endTime } = easternDateTime(now);
  const hours = computeHours(entry.start_time!, endTime);

  const { error } = await supabase
    .from('time_entries')
    .update({
      end_time: endTime,
      hours,
      clock_out_lat: input.lat,
      clock_out_lng: input.lng,
      status: 'submitted',
      edited_by: emp.id,
      edited_at: now.toISOString(),
    })
    .eq('id', input.entryId);
  if (error) return { error: error.message };
  revalidatePath('/clock');
  revalidatePath('/week');
  return { ok: true };
}
