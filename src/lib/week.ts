import { addDays, format, startOfWeek, endOfWeek, parseISO } from 'date-fns';

/**
 * Company week = Monday through Sunday. Matches how ComputerEase runs payroll.
 */
export function weekStart(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return startOfWeek(d, { weekStartsOn: 1 });
}

export function weekEnd(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return endOfWeek(d, { weekStartsOn: 1 });
}

export function weekDays(anchor: Date | string): Date[] {
  const start = weekStart(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function isoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function isoWeekStart(d: Date | string): string {
  return isoDate(weekStart(d));
}

export function isSameWeek(a: Date | string, b: Date | string): boolean {
  return isoWeekStart(a) === isoWeekStart(b);
}

export function dayOfWeekLabel(d: Date | string): string {
  const date = typeof d === 'string' ? parseISO(d) : d;
  return format(date, 'EEE');
}
