'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentEmployee } from '@/lib/session';
import { enrichEntry, computeHours } from '@/lib/enrich';
import { easternDateTime } from '@/lib/tz';

/** Resolve the moment to record. Falls back to server now if the worker
 *  didn't supply a tap time. Lets queued offline actions preserve the
 *  original tap time when they sync minutes or hours later. */
function tapDate(client_at_iso: string | null | undefined): Date {
  if (!client_at_iso) return new Date();
  const d = new Date(client_at_iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export async function clockIn(input: {
  job: string;
  phase: string;
  cat: string;
  lat: number | null;
  lng: number | null;
  client_at_iso?: string | null;
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

  const { date, time } = easternDateTime(tapDate(input.client_at_iso));
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

  const { data: inserted, error } = await supabase
    .from('time_entries')
    .insert(enriched)
    .select('id')
    .single();
  if (error) return { error: error.message };
  revalidatePath('/clock');
  revalidatePath('/week');
  return { ok: true, entryId: inserted.id as string };
}

/**
 * Best-effort GPS patch for entries whose lat/lng wasn't available at the
 * moment of clock-in/out. Called fire-and-forget once `getCurrentPosition`
 * resolves so the worker isn't kept waiting on a slow fix.
 */
export async function patchEntryLocation(input: {
  entryId: string;
  kind: 'clock_in' | 'clock_out';
  lat: number;
  lng: number;
}) {
  const emp = await getCurrentEmployee();
  if (!emp) return { error: 'Not signed in.' };
  const supabase = await createClient();
  const latCol = input.kind === 'clock_in' ? 'clock_in_lat' : 'clock_out_lat';
  const patch =
    input.kind === 'clock_in'
      ? { clock_in_lat: input.lat, clock_in_lng: input.lng }
      : { clock_out_lat: input.lat, clock_out_lng: input.lng };
  const { error } = await supabase
    .from('time_entries')
    .update(patch)
    .eq('id', input.entryId)
    .eq('employee_id', emp.id)
    .is(latCol, null);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function clockOut(input: {
  entryId: string;
  lat: number | null;
  lng: number | null;
  client_at_iso?: string | null;
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

  const tap = tapDate(input.client_at_iso);
  const { time: endTime } = easternDateTime(tap);
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
      edited_at: new Date().toISOString(),
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
export async function takeBreak(input: {
  entryId: string;
  lat: number | null;
  lng: number | null;
  client_at_iso?: string | null;
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

  const tap = tapDate(input.client_at_iso);
  const { time: endTime } = easternDateTime(tap);
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
      edited_at: new Date().toISOString(),
    })
    .eq('id', input.entryId);
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
  client_at_iso?: string | null;
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

  const tap = tapDate(input.client_at_iso);
  const { date, time } = easternDateTime(tap);
  const hours = computeHours(current.start_time!, time);

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

  // Preferred path: a Postgres function (migration 0003) closes the old
  // entry and inserts the new one inside a single transaction, so a worker
  // can never end up silently clocked out due to a partial write.
  const { error: rpcErr } = await supabase.rpc('switch_work_code', {
    p_entry_id: input.entryId,
    p_end_time: time,
    p_hours: hours,
    p_clock_out_lat: input.lat,
    p_clock_out_lng: input.lng,
    p_edited_by: emp.id,
    p_new_entry: enriched,
  });
  if (!rpcErr) {
    revalidatePath('/clock');
    revalidatePath('/week');
    return { ok: true };
  }
  // PGRST202 = function not in PostgREST schema cache (i.e. migration not
  // applied yet). Fall back to the imperative two-step + compensating
  // rollback. Any other error is real and gets surfaced to the worker.
  const isMissingFn =
    rpcErr.code === 'PGRST202' ||
    /function .* does not exist|could not find the function/i.test(rpcErr.message ?? '');
  if (!isMissingFn) return { error: rpcErr.message };

  // --- Fallback path: imperative close + insert with compensating rollback. ---
  const rollbackPatch = {
    end_time: current.end_time,
    hours: current.hours,
    clock_out_lat: current.clock_out_lat,
    clock_out_lng: current.clock_out_lng,
    status: current.status,
    edited_by: current.edited_by,
    edited_at: current.edited_at,
  };

  const { error: closeErr } = await supabase
    .from('time_entries')
    .update({
      end_time: time,
      hours,
      clock_out_lat: input.lat,
      clock_out_lng: input.lng,
      status: 'submitted',
      edited_by: emp.id,
      edited_at: new Date().toISOString(),
    })
    .eq('id', input.entryId);
  if (closeErr) return { error: closeErr.message };

  const { error: openErr } = await supabase.from('time_entries').insert(enriched);
  if (openErr) {
    // New entry didn't land — reopen the original so the worker isn't silently clocked out.
    await supabase.from('time_entries').update(rollbackPatch).eq('id', input.entryId);
    return { error: openErr.message };
  }
  revalidatePath('/clock');
  revalidatePath('/week');
  return { ok: true };
}
