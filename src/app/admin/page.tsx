import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { isoDate, weekDays, isoWeekStart } from '@/lib/week';

export default async function AdminHome() {
  const supabase = await createClient();
  const days = weekDays(new Date()).map(isoDate);

  const [emp, entries, pending] = await Promise.all([
    supabase.from('employees').select('id', { count: 'exact', head: true }).eq('active', true),
    supabase
      .from('time_entries')
      .select('id, status', { count: 'exact' })
      .gte('date', days[0])
      .lte('date', days[6]),
    supabase.from('change_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const submitted = entries.data?.filter((e) => e.status === 'submitted').length ?? 0;
  const approved = entries.data?.filter((e) => e.status === 'approved').length ?? 0;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Admin overview</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Stat label="Active employees" value={emp.count ?? 0} />
        <Stat label="Submitted this week" value={submitted} />
        <Stat label="Approved this week" value={approved} />
        <Stat label="Change requests" value={pending.count ?? 0} href="/admin/requests" />
      </div>
      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase text-brand-ink-500">Quick actions</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Link href="/admin/export" className="rounded-lg border border-brand-ink-200 bg-white px-4 py-3 hover:bg-brand-ink-50">
          Export payroll file →
        </Link>
        <Link href="/admin/entries" className="rounded-lg border border-brand-ink-200 bg-white px-4 py-3 hover:bg-brand-ink-50">
          Review / edit time entries →
        </Link>
        <Link href="/admin/employees/new" className="rounded-lg border border-brand-ink-200 bg-white px-4 py-3 hover:bg-brand-ink-50">
          Add employee →
        </Link>
        <Link href="/admin/jobs/new" className="rounded-lg border border-brand-ink-200 bg-white px-4 py-3 hover:bg-brand-ink-50">
          Add job →
        </Link>
      </div>
      <p className="mt-6 text-xs text-brand-ink-500">
        Week of {isoWeekStart(new Date())}.
      </p>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <div className="rounded-lg border border-brand-ink-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-brand-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
