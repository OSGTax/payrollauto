import { createClient } from '@/lib/supabase/server';
import { getCurrentEmployee } from '@/lib/session';
import { isoWeekStart, weekDays, isoDate, dayOfWeekLabel } from '@/lib/week';
import { format, parseISO } from 'date-fns';

export default async function WeekPage() {
  const emp = await getCurrentEmployee();
  if (!emp) return null;
  const supabase = await createClient();

  const start = isoWeekStart(new Date());
  const days = weekDays(new Date()).map(isoDate);

  const { data: entries } = await supabase
    .from('time_entries')
    .select('*')
    .eq('employee_id', emp.id)
    .gte('date', days[0])
    .lte('date', days[6])
    .order('date')
    .order('start_time');

  const byDay = new Map<string, typeof entries>();
  for (const e of entries ?? []) {
    const arr = byDay.get(e.date) ?? [];
    arr.push(e);
    byDay.set(e.date, arr);
  }

  const weekTotal =
    entries?.reduce((sum, e) => sum + Number(e.hours ?? 0), 0) ?? 0;

  return (
    <div className="mx-auto max-w-xl p-4">
      <div className="mb-3 flex items-end justify-between">
        <h1 className="text-lg font-semibold">Week of {format(parseISO(start), 'MMM d')}</h1>
        <p className="text-sm text-slate-500">
          <span className="text-base font-semibold text-slate-900 tabular-nums">
            {weekTotal.toFixed(2)}
          </span>{' '}
          hrs
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {days.map((d) => {
          const day = byDay.get(d) ?? [];
          const total = day.reduce((s, e) => s + Number(e.hours ?? 0), 0);
          return (
            <div key={d} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {dayOfWeekLabel(d)} {format(parseISO(d), 'M/d')}
                </span>
                <span className="tabular-nums text-sm text-slate-600">
                  {total > 0 ? total.toFixed(2) + ' h' : '—'}
                </span>
              </div>
              {day.length > 0 && (
                <ul className="mt-1 flex flex-col gap-1 text-sm text-slate-600">
                  {day.map((e) => (
                    <li key={e.id} className="flex justify-between">
                      <span>
                        {e.start_time?.slice(0, 5) ?? ''}
                        {e.end_time ? ' – ' + e.end_time.slice(0, 5) : ' · open'}
                        {' · '}
                        {e.job ? `${e.job}.${e.phase}.${e.cat}` : typeLabel(e.type)}
                      </span>
                      <span className="tabular-nums">{Number(e.hours).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function typeLabel(t: number): string {
  return (['', 'Reg', 'OT', 'Dbl', 'Sick', 'Vac', 'Hol'][t] ?? String(t));
}
