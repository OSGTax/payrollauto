'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/session';

export async function resolveRequest(id: string, status: 'approved' | 'rejected') {
  const emp = await requireRole(['manager', 'admin']);
  const supabase = await createClient();
  const { error } = await supabase
    .from('change_requests')
    .update({
      status,
      resolved_by: emp.id,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/requests');
  return { ok: true };
}
