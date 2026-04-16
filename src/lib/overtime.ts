import type { TimeEntry } from './types';
import { TYPE_REGULAR, TYPE_OVERTIME, TYPE_SICK, TYPE_VACATION, TYPE_HOLIDAY } from './types';
import { isoWeekStart } from './week';

/**
 * Weekly overtime split: anything over 40 hours of regular time in a Mon-Sun week
 * becomes OT (type=2, otmult=1.5). Sick/vacation/holiday do NOT count toward OT.
 *
 * We split by walking entries in chronological order and converting the tail-end
 * hours once the running regular total exceeds 40. The split may happen mid-entry
 * — in that case we emit two rows sharing everything except type/hours/otmult.
 *
 * Input entries must all belong to the same employee. Returns a new array;
 * does not mutate.
 */
export function splitOvertime(entries: TimeEntry[]): TimeEntry[] {
  const byWeek = new Map<string, TimeEntry[]>();
  for (const e of entries) {
    const k = isoWeekStart(e.date);
    const arr = byWeek.get(k) ?? [];
    arr.push(e);
    byWeek.set(k, arr);
  }

  const out: TimeEntry[] = [];
  for (const weekEntries of byWeek.values()) {
    // Sort chronologically within the week
    const sorted = [...weekEntries].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.start_time ?? '').localeCompare(b.start_time ?? '');
    });

    let running = 0;
    for (const e of sorted) {
      const countsForOT = e.type === TYPE_REGULAR;
      if (!countsForOT || e.type === TYPE_SICK || e.type === TYPE_VACATION || e.type === TYPE_HOLIDAY) {
        out.push(e);
        continue;
      }
      const remainingReg = Math.max(0, 40 - running);
      if (e.hours <= remainingReg) {
        out.push(e);
        running += e.hours;
        continue;
      }
      // Split
      if (remainingReg > 0) {
        out.push({ ...e, hours: remainingReg });
      }
      const otHours = e.hours - remainingReg;
      out.push({
        ...e,
        id: `${e.id}-ot`,
        type: TYPE_OVERTIME,
        otmult: 1.5,
        hours: otHours,
      });
      running = 40 + otHours;
    }
  }
  return out;
}
