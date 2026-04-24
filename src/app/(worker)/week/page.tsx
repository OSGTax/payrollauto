import { createClient } from '@/lib/supabase/server';
import { getCurrentEmployee } from '@/lib/session';
import { isoWeekStart, weekDays, isoDate, dayOfWeekLabel } from '@/lib/week';
import { formatTime12h } from '@/lib/time';
import { format, parseISO } from 'date-fns';

const REGULAR_WEEK_HOURS = 40;

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

  const regularHours = Math.min(weekTotal, REGULAR_WEEK_HOURS);
  const otHours = Math.max(0, weekTotal - REGULAR_WEEK_HOURS);
  const regularPct = Math.min(100, (regularHours / REGULAR_WEEK_HOURS) * 100);
  // Cap OT fill visually at an additional 25% of the bar so extreme OT doesn't blow out the layout.
  const otPct = Math.min(25, (otHours / REGULAR_WEEK_HOURS) * 100);

  return (
    <div className="mx-auto max-w-xl p-4">
      <div className="mb-3 flex items-end justify-between">
        <h1 className="text-lg font-semibold">Week of {format(parseISO(start), 'MMM d')}</h1>
        <p className="text-sm text-brand-ink-500">
          <span className="text-base font-semibold text-brand-ink-900 tabular-nums">
            {weekTotal.toFixed(2)}
          </span>{' '}
          hrs
        </p>
      </div>

      <WeekProgress
        weekTotal={weekTotal}
        regularPct={regularPct}
        otPct={otPct}
        otHours={otHours}
      />

      <div className="mt-4 flex flex-col gap-2">
        {days.map((d) => {
          const day = byDay.get(d) ?? [];
          const total = day.reduce((s, e) => s + Number(e.hours ?? 0), 0);
          return (
            <div key={d} className="rounded-xl border border-brand-ink-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {dayOfWeekLabel(d)} {format(parseISO(d), 'M/d')}
                </span>
                <span className="tabular-nums text-sm text-brand-ink-600">
                  {total > 0 ? total.toFixed(2) + ' h' : '—'}
                </span>
              </div>
              {day.length > 0 && (
                <ul className="mt-1 flex flex-col gap-1 text-sm text-brand-ink-600">
                  {day.map((e) => (
                    <li key={e.id} className="flex justify-between">
                      <span>
                        {formatTime12h(e.start_time, '')}
                        {e.end_time ? ' – ' + formatTime12h(e.end_time) : ' · open'}
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

function WeekProgress({
  weekTotal,
  regularPct,
  otPct,
  otHours,
}: {
  weekTotal: number;
  regularPct: number;
  otPct: number;
  otHours: number;
}) {
  const hitFulltime = weekTotal >= REGULAR_WEEK_HOURS;
  return (
    <div className="rounded-xl border border-brand-ink-200 bg-white p-3">
      <div className="mb-1 flex items-baseline justify-between text-xs text-brand-ink-500">
        <span>
          <span className="font-semibold text-brand-ink-900 tabular-nums">
            {weekTotal.toFixed(2)}
          </span>{' '}
          / {REGULAR_WEEK_HOURS}h
          {hitFulltime && (
            <span className="ml-2 rounded-full bg-brand-yellow-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-ink-800">
              Full week
            </span>
          )}
        </span>
        {otHours > 0 && (
          <span className="tabular-nums font-medium text-red-600">
            +{otHours.toFixed(2)}h OT
          </span>
        )}
      </div>
      <div
        className="relative h-3 w-full overflow-hidden rounded-full bg-brand-ink-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={REGULAR_WEEK_HOURS}
        aria-valuenow={Math.min(weekTotal, REGULAR_WEEK_HOURS)}
      >
        <div
          className="absolute inset-y-0 left-0 bg-brand-yellow-400 transition-[width] duration-500 ease-out"
          style={{ width: `${regularPct}%` }}
        />
        {otHours > 0 && (
          <div
            className="absolute inset-y-0 bg-red-500 transition-[width] duration-500 ease-out"
            style={{ left: `${regularPct}%`, width: `${otPct}%` }}
          />
        )}
      </div>
    </div>
  );
}

function typeLabel(t: number): string {
  return (['', 'Reg', 'OT', 'Dbl', 'Sick', 'Vac', 'Hol'][t] ?? String(t));
}
