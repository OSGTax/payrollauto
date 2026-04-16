import { createClient } from '@/lib/supabase/server';
import { RefTable } from '../_ref/RefTable';

export default async function DepartmentsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('departments').select('*').order('code');
  return (
    <RefTable
      title="Departments"
      table="departments"
      rows={data ?? []}
      revalidateRoute="/admin/departments"
    />
  );
}
