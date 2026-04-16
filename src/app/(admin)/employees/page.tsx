import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function EmployeesPage() {
  const supabase = await createClient();
  const { data: emps } = await supabase
    .from('employees')
    .select('id, emp_code, first_name, last_name, role, department, default_class, active')
    .order('last_name');

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Employees</h1>
        <Link href="/admin/employees/new" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
          + Add employee
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Dept</th>
              <th className="px-3 py-2">Class</th>
              <th className="px-3 py-2">Status</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {emps?.map((e) => (
              <tr key={e.id}>
                <td className="px-3 py-2 font-mono">{e.emp_code}</td>
                <td className="px-3 py-2">{e.first_name} {e.last_name}</td>
                <td className="px-3 py-2 uppercase text-xs">{e.role}</td>
                <td className="px-3 py-2">{e.department ?? '—'}</td>
                <td className="px-3 py-2">{e.default_class ?? '—'}</td>
                <td className="px-3 py-2">
                  <span className={e.active ? 'text-emerald-600' : 'text-slate-400'}>
                    {e.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/admin/employees/${e.id}`} className="text-slate-600 hover:underline">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
