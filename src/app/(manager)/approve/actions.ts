'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/session';

export async function approveEntries(ids: string[]) {
  const emp = await requireRole(['manager', 'admin']);
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('time_entries')
    .update({ status: 'approved', approved_by: emp.id, approved_at: now })
    .in('id', ids);
  if (error) return { error: error.message };
  revalidatePath('/approve');
  return { ok: true };
}

export async function overrideEntry(input: {
  id: string;
  class?: string | null;
  job?: string | null;
  phase?: string | null;
  cat?: string | null;
}) {
  const emp = await requireRole(['manager', 'admin']);
  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    edited_by: emp.id,
    edited_at: new Date().toISOString(),
  };
  if (input.class !== undefined) patch.class = input.class;
  if (input.job !== undefined) patch.job = input.job;
  if (input.phase !== undefined) patch.phase = input.phase;
  if (input.cat !== undefined) patch.cat = input.cat;
  const { error } = await supabase.from('time_entries').update(patch).eq('id', input.id);
  if (error) return { error: error.message };
  revalidatePath('/approve');
  return { ok: true };
}
