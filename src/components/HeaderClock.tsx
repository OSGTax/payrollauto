'use client';

import { useEffect, useState } from 'react';
import { APP_TZ } from '@/lib/tz';

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TZ,
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

function formatNow(): string {
  // Intl returns "7:14:05 AM" — normalized across browsers.
  return formatter.format(new Date());
}

export function HeaderClock() {
  const [time, setTime] = useState(formatNow);

  useEffect(() => {
    const id = setInterval(() => setTime(formatNow()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span
      suppressHydrationWarning
      aria-label="Current time"
      className="rounded border border-brand-yellow-400/40 bg-brand-ink-800 px-2 py-1 font-mono text-sm tabular-nums text-brand-yellow-400 tracking-wider"
    >
      {time}
    </span>
  );
}
