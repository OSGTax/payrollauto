import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EmployeeForm } from '../EmployeeForm';
import { ResetPassword } from '../ResetPassword';

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [emp, depts, classes, wcs] = await Promise.all([
    supabase.from('employees').select('*').eq('id', id).maybeSingle(),
    supabase.from('departments').select('code, description').eq('active', true),
    supabase.from('worker_classes').select('code, description').eq('active', true),
    supabase.from('wcomp_codes').select('code, description').eq('active', true),
  ]);
  if (!emp.data) notFound();

  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-semibold">
        Edit {emp.data.first_name} {emp.data.last_name}
      </h1>
      <EmployeeForm
        employee={emp.data}
        departments={depts.data ?? []}
        classes={classes.data ?? []}
        wcompCodes={wcs.data ?? []}
      />
      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Reset password</h2>
        <ResetPassword employeeId={emp.data.id} />
      </section>
    </div>
  );
}
