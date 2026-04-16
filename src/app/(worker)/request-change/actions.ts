'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentEmployee } from '@/lib/session';

export async function submitChange(input: { entryId: string; message: string }) {
  const emp = await getCurrentEmployee();
  if (!emp) return { error: 'Not signed in.' };
  const supabase = await createClient();
  const { error } = await supabase.from('change_requests').insert({
    time_entry_id: input.entryId,
    requested_by: emp.id,
    message: input.message,
  });
  if (error) return { error: error.message };
  revalidatePath('/request-change');
  return { ok: true };
}
