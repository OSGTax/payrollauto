'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/session';

type Patch = {
  date: string;
  start_time: string | null;
  end_time: string | null;
  hours: number;
  type: number;
  otmult: number | null;
  job: string;
  phase: string;
  cat: string;
  class: string;
  department: string;
  worktype: number;
  wcomp1: string;
  wcomp2: string;
  rate: number | null;
  notes: string;
  status: string;
};

export async function saveEntry(id: string, patch: Patch) {
  const emp = await requireRole(['admin']);
  const supabase = await createClient();
  const { error } = await supabase
    .from('time_entries')
    .update({
      date: patch.date,
      start_time: patch.start_time,
      end_time: patch.end_time,
      hours: patch.hours,
      type: patch.type,
      otmult: patch.otmult,
      job: patch.job || null,
      phase: patch.phase || null,
      cat: patch.cat || null,
      class: patch.class || null,
      department: patch.department || null,
      worktype: patch.worktype,
      wcomp1: patch.wcomp1 || null,
      wcomp2: patch.wcomp2 || null,
      rate: patch.rate,
      notes: patch.notes || null,
      status: patch.status,
      edited_by: emp.id,
      edited_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/entries');
  return { ok: true };
}

export async function deleteEntry(id: string) {
  await requireRole(['admin']);
  const supabase = await createClient();
  const { error } = await supabase.from('time_entries').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/entries');
  return { ok: true };
}
