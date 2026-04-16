import { createClient } from '@/lib/supabase/server';
import { getCurrentEmployee } from '@/lib/session';
import { ChangeForm } from './ChangeForm';
import { isoDate, weekDays } from '@/lib/week';
import { addDays, subDays } from 'date-fns';

export default async function RequestChangePage() {
  const emp = await getCurrentEmployee();
  if (!emp) return null;
  const supabase = await createClient();
  const now = new Date();
  const from = isoDate(subDays(now, 14));
  const to = isoDate(addDays(now, 1));

  const { data: entries } = await supabase
    .from('time_entries')
    .select('*')
    .eq('employee_id', emp.id)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false });

  const { data: pending } = await supabase
    .from('change_requests')
    .select('*')
    .eq('requested_by', emp.id)
    .order('requested_at', { ascending: false })
    .limit(5);

  return (
    <div className="mx-auto max-w-xl p-4">
      <h1 className="mb-3 text-lg font-semibold">Request a change</h1>
      <ChangeForm entries={entries ?? []} />
      {pending && pending.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-slate-600">Recent requests</h2>
          <ul className="flex flex-col gap-2">
            {pending.map((p) => (
              <li key={p.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium uppercase">{p.status}</span>
                  <span className="text-xs text-slate-500">
                    {new Date(p.requested_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="mt-1 text-slate-600">{p.message}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
