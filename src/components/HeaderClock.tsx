'use client';

import { useEffect, useState } from 'react';

function formatNow() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
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
