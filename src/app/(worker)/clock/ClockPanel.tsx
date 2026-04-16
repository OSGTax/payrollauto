'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { JobPicker } from '@/components/JobPicker';
import { clockIn, clockOut } from './actions';
import type { Job, TimeEntry } from '@/lib/types';
import { format } from 'date-fns';

type Props = {
  employee: { id: string; first_name: string };
  openEntry: TimeEntry | null;
  jobs: Job[];
};

function geolocate(): Promise<{ lat: number; lng: number } | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { maximumAge: 30_000, timeout: 5_000 },
    );
  });
}

export function ClockPanel({ employee, openEntry, jobs }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pickedJob, setPickedJob] = useState<string | null>(null);
  const [pickedPhase, setPickedPhase] = useState<string | null>(null);
  const [pickedCat, setPickedCat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isClockedIn = !!openEntry;

  async function handleClockIn() {
    setError(null);
    if (!pickedJob || !pickedPhase || !pickedCat) {
      setError('Pick a job, phase, and category first.');
      return;
    }
    const geo = await geolocate();
    startTransition(async () => {
      const res = await clockIn({
        job: pickedJob,
        phase: pickedPhase,
        cat: pickedCat,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
      });
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  async function handleClockOut() {
    setError(null);
    const geo = await geolocate();
    startTransition(async () => {
      const res = await clockOut({
        entryId: openEntry!.id,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
      });
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  if (isClockedIn) {
    const startedAt = openEntry.start_time?.slice(0, 5) ?? '--:--';
    return (
      <div className="flex flex-col items-center gap-6 pt-8 text-center">
        <p className="text-sm uppercase tracking-wide text-slate-500">Clocked in</p>
        <p className="text-5xl font-bold tabular-nums">{startedAt}</p>
        <p className="text-sm text-slate-600">
          {openEntry.job} · {openEntry.phase} · {openEntry.cat}
        </p>
        <button
          onClick={handleClockOut}
          disabled={pending}
          className="clock-btn flex h-48 w-48 items-center justify-center rounded-full bg-red-600 text-2xl font-bold text-white shadow-lg active:scale-95 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Clock out'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-2 text-center">
      <p className="text-sm uppercase tracking-wide text-slate-500">
        {format(new Date(), 'EEEE, MMM d')}
      </p>
      <p className="text-lg">Hi {employee.first_name}</p>

      <div className="w-full rounded-xl border border-slate-200 bg-white p-3">
        <JobPicker
          jobs={jobs}
          value={{ job: pickedJob, phase: pickedPhase, cat: pickedCat }}
          onChange={(v) => {
            setPickedJob(v.job);
            setPickedPhase(v.phase);
            setPickedCat(v.cat);
          }}
        />
      </div>

      <button
        onClick={handleClockIn}
        disabled={pending || !pickedJob || !pickedPhase || !pickedCat}
        className="clock-btn flex h-48 w-48 items-center justify-center rounded-full bg-emerald-600 text-2xl font-bold text-white shadow-lg active:scale-95 disabled:opacity-50"
      >
        {pending ? 'Saving…' : 'Clock in'}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
