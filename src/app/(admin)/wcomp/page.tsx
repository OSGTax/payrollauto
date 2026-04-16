import { createClient } from '@/lib/supabase/server';
import { RefTable } from '../_ref/RefTable';

export default async function WCompPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('wcomp_codes').select('*').order('code');
  return (
    <RefTable
      title="Workers' comp codes"
      table="wcomp_codes"
      rows={data ?? []}
      revalidateRoute="/admin/wcomp"
    />
  );
}
