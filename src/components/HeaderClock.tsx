'use client';

import { useEffect, useState } from 'react';

function formatNow() {
  const d = new Date();
  const h24 = d.getHours();
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${h12}:${mm}:${ss} ${period}`;
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
