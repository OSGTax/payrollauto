import { createClient } from '@/lib/supabase/server';
import { RefTable } from '../_ref/RefTable';

export default async function ClassesPage() {
  const supabase = await createClient();
  const [rows, wcs] = await Promise.all([
    supabase.from('worker_classes').select('*').order('code'),
    supabase.from('wcomp_codes').select('code').eq('active', true),
  ]);
  return (
    <RefTable
      title="Worker classes"
      table="worker_classes"
      rows={rows.data ?? []}
      revalidateRoute="/admin/classes"
      hasWcompDefaults
      wcompOptions={(wcs.data ?? []).map((r) => r.code)}
    />
  );
}
