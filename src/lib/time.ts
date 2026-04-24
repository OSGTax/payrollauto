/**
 * Format a "HH:mm" or "HH:mm:ss" time string as 12-hour "h:mm a".
 * Returns the fallback (default "--") for null/undefined/malformed input.
 */
export function formatTime12h(
  value: string | null | undefined,
  fallback = '--',
): string {
  if (!value) return fallback;
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return fallback;
  const h24 = Number(m[1]);
  const mm = m[2];
  if (Number.isNaN(h24) || h24 < 0 || h24 > 23) return fallback;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${period}`;
}

/** Render a range like "7:14 AM – 3:22 PM" with graceful fallbacks. */
export function formatTimeRange(
  start: string | null | undefined,
  end: string | null | undefined,
  openLabel = 'open',
): string {
  const s = formatTime12h(start, '--');
  if (!end) return `${s} · ${openLabel}`;
  return `${s} – ${formatTime12h(end, '--')}`;
}
