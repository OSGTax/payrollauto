import { createClient } from '@/lib/supabase/server';
import { getCurrentEmployee } from '@/lib/session';
import { isoDate, weekDays } from '@/lib/week';
import { SickForm } from './SickForm';

export default async function SickPage() {
  const emp = await getCurrentEmployee();
  if (!emp) return null;
  const supabase = await createClient();
  const days = weekDays(new Date()).map(isoDate);
  const { data: existing } = await supabase
    .from('time_entries')
    .select('id, date, hours, type')
    .eq('employee_id', emp.id)
    .gte('date', days[0])
    .lte('date', days[6])
    .in('type', [4]);

  return (
    <div className="mx-auto max-w-xl p-4">
      <h1 className="mb-3 text-lg font-semibold">Sick day</h1>
      <p className="mb-4 text-sm text-slate-600">
        Log up to 8 hours of sick time on any day in the current week. Once the
        week passes you can only request a change.
      </p>
      <SickForm weekDays={days} existing={existing ?? []} />
    </div>
  );
}
