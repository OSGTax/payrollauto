'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { logSick } from './actions';

type Existing = { id: string; date: string; hours: number; type: number };

export function SickForm({ weekDays, existing }: { weekDays: string[]; existing: Existing[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(weekDays[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
  const [hours, setHours] = useState(8);
  const [error, setError] = useState<string | null>(null);

  const existingByDate = new Map(existing.map((e) => [e.date, e]));

  function submit() {
    setError(null);
    if (hours <= 0 || hours > 8) {
      setError('Sick hours must be between 0 and 8.');
      return;
    }
    startTransition(async () => {
      const res = await logSick({ date, hours });
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-600">Day</span>
        <select
          className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        >
          {weekDays.map((d) => (
            <option key={d} value={d}>
              {format(parseISO(d), 'EEE M/d')}
              {existingByDate.has(d) ? ` (${existingByDate.get(d)!.hours}h logged)` : ''}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-slate-600">Hours</span>
        <input
          type="number"
          min={0.25}
          max={8}
          step={0.25}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={pending}
        className="mt-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white active:bg-slate-700 disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Log sick time'}
      </button>
    </div>
  );
}
