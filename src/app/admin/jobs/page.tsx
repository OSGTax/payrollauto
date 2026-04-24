import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { JobsImport } from './JobsImport';

export default async function JobsPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from('jobs')
    .select('job_code, description, state, local, default_worktype, active')
    .order('job_code');
  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Jobs</h1>
        <Link href="/admin/jobs/new" className="rounded-lg bg-brand-yellow-400 hover:bg-brand-yellow-500 px-3 py-2 text-sm font-medium text-brand-ink-900">
          + Add job
        </Link>
      </div>
      <div className="mb-6 rounded-lg border border-brand-ink-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Bulk import</h2>
        <p className="mb-3 text-sm text-brand-ink-600">
          Paste CSV rows exported from ComputerEase. Columns:{' '}
          <code className="rounded bg-brand-ink-100 px-1">job_code,description,state,local</code> —
          or with phases/categories:{' '}
          <code className="rounded bg-brand-ink-100 px-1">job,phase,cat,description</code>.
        </p>
        <JobsImport />
      </div>
      <div className="overflow-hidden rounded-lg border border-brand-ink-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-ink-50 text-left text-xs uppercase text-brand-ink-500">
            <tr>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">State / Local</th>
              <th className="px-3 py-2">Worktype</th>
              <th className="px-3 py-2">Status</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-ink-200">
            {jobs?.map((j) => (
              <tr key={j.job_code}>
                <td className="px-3 py-2 font-mono">{j.job_code}</td>
                <td className="px-3 py-2">{j.description}</td>
                <td className="px-3 py-2 text-brand-ink-600">
                  {j.state ?? '—'} / {j.local ?? '—'}
                </td>
                <td className="px-3 py-2 text-brand-ink-600">
                  {['', 'Job', 'Shop', 'Travel'][j.default_worktype ?? 0] ?? j.default_worktype}
                </td>
                <td className="px-3 py-2">
                  <span className={j.active ? 'text-emerald-600' : 'text-brand-ink-300'}>
                    {j.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/admin/jobs/${encodeURIComponent(j.job_code)}`} className="text-brand-ink-600 hover:underline">
                    Phases & cats →
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
