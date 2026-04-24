'use client';

import Link from 'next/link';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { isoDate, isoWeekStart } from '@/lib/week';

export function WeekNav({ anchorIso }: { anchorIso: string }) {
  const anchor = parseISO(anchorIso);
  const prev = isoDate(subDays(anchor, 7));
  const next = isoDate(addDays(anchor, 7));
  const today = isoDate(new Date());
  const thisWeek = isoWeekStart(today);
  const currentWeek = isoWeekStart(anchorIso);
  const isCurrent = thisWeek === currentWeek;

  return (
    <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-brand-ink-200 bg-white p-2">
      <Link
        href={`/approve?week=${prev}`}
        className="rounded px-3 py-1.5 text-sm hover:bg-brand-ink-100"
      >
        ← Previous
      </Link>
      <div className="text-center">
        <p className="text-sm font-medium">
          Week of {format(parseISO(currentWeek), 'MMM d, yyyy')}
        </p>
        {!isCurrent && (
          <Link
            href={`/approve?week=${today}`}
            className="text-xs text-emerald-700 hover:underline"
          >
            Jump to this week
          </Link>
        )}
      </div>
      <Link
        href={`/approve?week=${next}`}
        className="rounded px-3 py-1.5 text-sm hover:bg-brand-ink-100"
      >
        Next →
      </Link>
    </div>
  );
}
