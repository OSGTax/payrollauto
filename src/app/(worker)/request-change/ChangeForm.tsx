'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { VoiceInput } from '@/components/VoiceInput';
import { submitChange } from './actions';
import type { TimeEntry } from '@/lib/types';
import { format, parseISO } from 'date-fns';

export function ChangeForm({ entries }: { entries: TimeEntry[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [entryId, setEntryId] = useState(entries[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!entryId) { setError('Pick an entry.'); return; }
    if (!message.trim()) { setError('Say what needs to change.'); return; }
    startTransition(async () => {
      const res = await submitChange({ entryId, message });
      if (res?.error) setError(res.error);
      else {
        setMessage('');
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-brand-ink-600">Entry</span>
        <select
          className="rounded-lg border border-brand-ink-200 bg-white px-3 py-2"
          value={entryId}
          onChange={(e) => setEntryId(e.target.value)}
        >
          {entries.length === 0 && <option value="">No entries</option>}
          {entries.map((e) => (
            <option key={e.id} value={e.id}>
              {format(parseISO(e.date), 'EEE M/d')} ·{' '}
              {e.start_time?.slice(0, 5) ?? '--'}-{e.end_time?.slice(0, 5) ?? '--'} ·{' '}
              {Number(e.hours).toFixed(2)}h ·{' '}
              {e.job ? `${e.job}.${e.phase}.${e.cat}` : 'Other'}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-brand-ink-600">What needs to change?</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="e.g. Clock-out was 5:30, not 5:00"
          className="rounded-lg border border-brand-ink-200 bg-white px-3 py-2"
        />
        <VoiceInput onText={(t) => setMessage((m) => (m ? m + ' ' + t : t))} />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={pending}
        className="mt-2 rounded-lg bg-brand-yellow-400 hover:bg-brand-yellow-500 px-4 py-2 font-medium text-brand-ink-900 active:bg-brand-yellow-600 disabled:opacity-50"
      >
        {pending ? 'Sending…' : 'Send request'}
      </button>
    </div>
  );
}
