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

/**
 * Close out the current entry without starting a new one — worker goes off the clock.
 * When they come back, the JobPicker pre-fills with the just-closed codes so one tap resumes.
 */
export async function takeBreak(entryId: string) {
  const emp = await getCurrentEmployee();
  if (!emp) return { error: 'Not signed in.' };
  const supabase = await createClient();

  const { data: entry } = await supabase
    .from('time_entries')
    .select('*')
    .eq('id', entryId)
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
      status: 'submitted',
      edited_by: emp.id,
      edited_at: now.toISOString(),
    })
    .eq('id', entryId);
  if (error) return { error: error.message };
  revalidatePath('/clock');
  revalidatePath('/week');
  return { ok: true };
}

/**
 * Close the current entry and immediately open a new one with the new codes.
 * Worker stays on the clock continuously; payroll ends up with two entries that
 * cover the full span.
 */
export async function switchWorkCode(input: {
  entryId: string;
  job: string;
  phase: string;
  cat: string;
  lat: number | null;
  lng: number | null;
}) {
  const emp = await getCurrentEmployee();
  if (!emp) return { error: 'Not signed in.' };
  const supabase = await createClient();

  const { data: current } = await supabase
    .from('time_entries')
    .select('*')
    .eq('id', input.entryId)
    .maybeSingle();
  if (!current) return { error: 'Entry not found.' };

  // No-op if nothing actually changed.
  if (current.job === input.job && current.phase === input.phase && current.cat === input.cat) {
    return { ok: true, unchanged: true };
  }

  const now = new Date();
  const { date, time } = easternDateTime(now);
  const hours = computeHours(current.start_time!, time);

  const { error: closeErr } = await supabase
    .from('time_entries')
    .update({
      end_time: time,
      hours,
      clock_out_lat: input.lat,
      clock_out_lng: input.lng,
      status: 'submitted',
      edited_by: emp.id,
      edited_at: now.toISOString(),
    })
    .eq('id', input.entryId);
  if (closeErr) return { error: closeErr.message };

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

  const { error: openErr } = await supabase.from('time_entries').insert(enriched);
  if (openErr) return { error: openErr.message };
  revalidatePath('/clock');
  revalidatePath('/week');
  return { ok: true };
}
