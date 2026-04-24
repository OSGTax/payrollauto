'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { resolveRequest } from './actions';
import { format, parseISO } from 'date-fns';
import { formatTime12h } from '@/lib/time';

type Row = {
  id: string;
  time_entry_id: string;
  requested_at: string;
  message: string | null;
  voice_text: string | null;
  status: string;
  resolution_note: string | null;
  requested_by: { emp_code: string; first_name: string; last_name: string } | null;
  entry: {
    date: string;
    start_time: string | null;
    end_time: string | null;
    hours: number;
    job: string | null;
    phase: string | null;
    cat: string | null;
    type: number;
  } | null;
};

export function RequestRow({ row }: { row: Row }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function resolve(status: 'approved' | 'rejected') {
    startTransition(async () => {
      await resolveRequest(row.id, status);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-brand-ink-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {row.requested_by?.first_name} {row.requested_by?.last_name}{' '}
            <span className="font-mono text-xs text-brand-ink-500">{row.requested_by?.emp_code}</span>
          </p>
          <p className="text-xs text-brand-ink-500">
            {format(parseISO(row.requested_at), 'PP p')} ·{' '}
            {row.entry && (
              <>
                Entry {format(parseISO(row.entry.date), 'M/d')}{' '}
                {formatTime12h(row.entry.start_time)}–{formatTime12h(row.entry.end_time)} ·{' '}
                {Number(row.entry.hours).toFixed(2)}h
              </>
            )}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs uppercase ${
            row.status === 'pending'
              ? 'bg-amber-100 text-amber-700'
              : row.status === 'approved'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-brand-ink-100 text-brand-ink-600'
          }`}
        >
          {row.status}
        </span>
      </div>
      <p className="mt-2 text-sm text-brand-ink-700">{row.message}</p>
      {row.voice_text && (
        <p className="mt-1 text-xs italic text-brand-ink-500">🎤 {row.voice_text}</p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <Link
          href={`/admin/entries/${row.time_entry_id}`}
          className="rounded border border-brand-ink-200 px-2 py-1 text-xs hover:bg-brand-ink-50"
        >
          Open entry
        </Link>
        {row.status === 'pending' && (
          <>
            <button
              onClick={() => resolve('approved')}
              disabled={pending}
              className="rounded bg-emerald-600 px-2 py-1 text-xs text-white"
            >
              Mark done
            </button>
            <button
              onClick={() => resolve('rejected')}
              disabled={pending}
              className="rounded border border-brand-ink-200 px-2 py-1 text-xs text-brand-ink-700"
            >
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}
