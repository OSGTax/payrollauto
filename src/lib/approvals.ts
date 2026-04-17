import { createClient } from './supabase/server';

export async function countPendingApprovals(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('time_entries')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'submitted');
  return count ?? 0;
}
