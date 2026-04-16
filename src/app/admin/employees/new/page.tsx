import { EmployeeForm } from '../EmployeeForm';
import { createClient } from '@/lib/supabase/server';

export default async function NewEmployeePage() {
  const supabase = await createClient();
  const [depts, classes, wcs] = await Promise.all([
    supabase.from('departments').select('code, description').eq('active', true),
    supabase.from('worker_classes').select('code, description').eq('active', true),
    supabase.from('wcomp_codes').select('code, description').eq('active', true),
  ]);
  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Add employee</h1>
      <EmployeeForm
        departments={depts.data ?? []}
        classes={classes.data ?? []}
        wcompCodes={wcs.data ?? []}
      />
    </div>
  );
}
