/**
 * Timezone helpers pinned to Eastern time (the only timezone this company operates in).
 *
 * Why not use the server's local timezone? Serverless hosts (Vercel, AWS Lambda)
 * default to UTC, so date-fns `format(new Date(), 'HH:mm:ss')` gives UTC time —
 * four hours off for a worker in EDT. We explicitly format + parse in
 * America/New_York so stored times match what the worker actually saw on their phone.
 */
export const APP_TZ = 'America/New_York';

/** Returns { date: 'YYYY-MM-DD', time: 'HH:mm:ss' } for the given instant, in Eastern. */
export function easternDateTime(d: Date = new Date()): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  // en-CA sometimes emits '24' for midnight; normalize.
  const hour = get('hour') === '24' ? '00' : get('hour');
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${hour}:${get('minute')}:${get('second')}`,
  };
}

/** Eastern date only, 'YYYY-MM-DD'. */
export function easternDate(d: Date = new Date()): string {
  return easternDateTime(d).date;
}

/**
 * Given a date+time that represents an Eastern wall-clock (e.g. DB values
 * stored by easternDateTime), return the absolute Unix ms for that moment.
 * Handles DST transitions via Intl offset lookup.
 */
export function parseEasternWallClock(dateStr: string, timeStr: string): number {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h = 0, mi = 0, s = 0] = timeStr.split(':').map(Number);
  const asIfUtc = Date.UTC(y, mo - 1, d, h, mi, s);
  return asIfUtc - easternOffsetMs(asIfUtc);
}

/** Eastern offset from UTC (ms) at a given instant. Negative for EDT/EST. */
function easternOffsetMs(utcMs: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TZ,
    timeZoneName: 'shortOffset',
    hour: 'numeric',
  }).formatToParts(new Date(utcMs));
  const tz = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-5';
  const m = /GMT([+-])(\d{1,2})(?::?(\d{2}))?/.exec(tz);
  if (!m) return -5 * 60 * 60 * 1000;
  const sign = m[1] === '+' ? 1 : -1;
  const hh = Number(m[2]);
  const mm = Number(m[3] ?? 0);
  return sign * (hh * 60 + mm) * 60 * 1000;
}
