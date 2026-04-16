'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentEmployee } from '@/lib/session';
import { enrichEntry } from '@/lib/enrich';
import { isSameWeek } from '@/lib/week';
import { TYPE_SICK } from '@/lib/types';

export async function logSick(input: { date: string; hours: number }) {
  const emp = await getCurrentEmployee();
  if (!emp) return { error: 'Not signed in.' };
  if (!isSameWeek(input.date, new Date())) {
    return { error: 'Sick time can only be logged for the current week.' };
  }
  if (input.hours <= 0 || input.hours > 8) {
    return { error: 'Sick hours must be between 0 and 8.' };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('time_entries')
    .select('id, hours')
    .eq('employee_id', emp.id)
    .eq('date', input.date)
    .eq('type', TYPE_SICK)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('time_entries')
      .update({ hours: input.hours, edited_by: emp.id, edited_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const enriched = enrichEntry(
      {
        date: input.date,
        hours: input.hours,
        type: TYPE_SICK,
        status: 'submitted',
        created_by: emp.id,
      },
      emp,
      null,
    );
    const { error } = await supabase.from('time_entries').insert(enriched);
    if (error) return { error: error.message };
  }

  revalidatePath('/sick');
  revalidatePath('/week');
  return { ok: true };
}
