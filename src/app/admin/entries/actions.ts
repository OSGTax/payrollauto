'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/session';

export async function pushBackEntries(ids: string[], note: string) {
  const emp = await requireRole(['admin']);
  if (ids.length === 0) return { error: 'No entries selected.' };
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error, count } = await supabase
    .from('time_entries')
    .update({
      status: 'submitted',
      admin_note: note.trim() || null,
      pushed_back_at: now,
      pushed_back_by: emp.id,
      approved_by: null,
      approved_at: null,
    }, { count: 'exact' })
    .in('id', ids)
    .eq('status', 'approved');
  if (error) return { error: error.message };
  revalidatePath('/admin/entries');
  revalidatePath('/approve');
  return { ok: true, updated: count ?? 0 };
}
