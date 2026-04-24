'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Briefcase } from 'lucide-react';
import { JobPicker } from '@/components/JobPicker';
import { useToast } from '@/components/Toast';
import { formatTime12h } from '@/lib/time';
import { parseEasternWallClock } from '@/lib/tz';
import { clockIn, clockOut } from './actions';
import type { Job, TimeEntry } from '@/lib/types';
import type { OpenEntryDetail } from './page';
import { format } from 'date-fns';

type Props = {
  employee: { id: string; first_name: string };
  openEntry: TimeEntry | null;
  openEntryDetail?: OpenEntryDetail | null;
  jobs: Job[];
};

type GeoState = { status: 'idle' | 'locating' | 'ok' | 'denied' | 'unavailable'; lat?: number; lng?: number };

const WORKTYPE_LABELS: Record<number, string> = { 1: 'Job', 2: 'Shop', 3: 'Travel' };

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

function buzz(ms: number | number[] = 40) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(ms); } catch { /* no-op */ }
  }
}

function formatElapsed(startMs: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * The DB stores Eastern wall-clock in separate date + time columns.
 * Parse them back into a Unix ms at that Eastern instant so the elapsed
 * counter is correct regardless of the client or server timezone.
 */
function startMsFromEntry(entry: TimeEntry): number {
  if (!entry.start_time) return Date.now();
  const t = entry.start_time.length === 5 ? entry.start_time + ':00' : entry.start_time;
  return parseEasternWallClock(entry.date, t);
}

export function ClockPanel({ employee, openEntry, openEntryDetail, jobs }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [pickedJob, setPickedJob] = useState<string | null>(null);
  const [pickedPhase, setPickedPhase] = useState<string | null>(null);
  const [pickedCat, setPickedCat] = useState<string | null>(null);
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' });
  const [pulseKey, setPulseKey] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);

  const isClockedIn = !!openEntry;

  // Warm up GPS early so the chip resolves before the worker hits the button.
  useEffect(() => {
    if (isClockedIn) return;
    if (!('geolocation' in navigator)) {
      setGeo({ status: 'unavailable' });
      return;
    }
    setGeo({ status: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (p) => setGeo({ status: 'ok', lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setGeo({ status: 'denied' }),
      { maximumAge: 30_000, timeout: 7_000 },
    );
  }, [isClockedIn]);

  // Live elapsed counter while clocked in.
  const [elapsed, setElapsed] = useState('00:00:00');
  useEffect(() => {
    if (!isClockedIn || !openEntry) return;
    const startMs = startMsFromEntry(openEntry);
    const id = setInterval(() => setElapsed(formatElapsed(startMs)), 1000);
    setElapsed(formatElapsed(startMs));
    return () => clearInterval(id);
  }, [isClockedIn, openEntry]);

  async function handleClockIn() {
    if (!pickedJob || !pickedPhase || !pickedCat) {
      toast.error('Pick a job, phase, and category first.');
      return;
    }
    buzz(40);
    setPulseKey((k) => k + 1);
    const coords = await geolocate();
    startTransition(async () => {
      const res = await clockIn({
        job: pickedJob,
        phase: pickedPhase,
        cat: pickedCat,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
      if (res?.error) {
        toast.error('Could not clock in', res.error);
        buzz([20, 40, 20]);
        return;
      }
      buzz([30, 50, 60]);
      toast.success(
        `Clocked in · ${format(new Date(), 'h:mm a')}`,
        `${pickedJob} · ${pickedPhase} · ${pickedCat}`,
      );
      router.refresh();
    });
  }

  async function handleClockOut() {
    buzz(40);
    setPulseKey((k) => k + 1);
    const coords = await geolocate();
    startTransition(async () => {
      const res = await clockOut({
        entryId: openEntry!.id,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
      if (res?.error) {
        toast.error('Could not clock out', res.error);
        buzz([20, 40, 20]);
        return;
      }
      buzz([60, 40, 30]);
      toast.success(`Clocked out · ${format(new Date(), 'h:mm a')}`, `Total: ${elapsed}`);
      router.refresh();
    });
  }

  if (isClockedIn && openEntry) {
    const startedAtLabel = formatTime12h(openEntry.start_time, '--:-- --');
    return (
      <div className="flex flex-col items-center gap-5 pt-6 text-center">
        <p className="text-xs uppercase tracking-widest text-brand-ink-500">On the clock</p>
        <p
          className="font-mono text-6xl font-bold tabular-nums text-brand-ink-900"
          aria-live="polite"
        >
          {elapsed}
        </p>
        <p className="text-xs text-brand-ink-500">
          Started at <span className="font-medium text-brand-ink-700">{startedAtLabel}</span>
        </p>

        <JobCostCard entry={openEntry} detail={openEntryDetail ?? null} />

        <button
          key={pulseKey}
          ref={btnRef}
          onClick={handleClockOut}
          disabled={pending}
          className="clock-btn clock-breathe clock-pulse flex h-48 w-48 items-center justify-center rounded-full bg-red-600 text-2xl font-bold text-white shadow-lg ring-4 ring-brand-yellow-400 ring-offset-4 ring-offset-brand-ink-50 transition-transform active:scale-95 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Clock out'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 pt-2 text-center">
      <p className="text-sm uppercase tracking-wide text-brand-ink-500">
        {format(new Date(), 'EEEE, MMM d')}
      </p>
      <p className="text-lg">Hi {employee.first_name}</p>

      <GpsChip geo={geo} />

      <div className="w-full rounded-xl border border-brand-ink-200 bg-white p-3">
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
        key={pulseKey}
        onClick={handleClockIn}
        disabled={pending || !pickedJob || !pickedPhase || !pickedCat}
        className="clock-btn clock-pulse flex h-48 w-48 items-center justify-center rounded-full bg-emerald-600 text-2xl font-bold text-white shadow-lg ring-4 ring-brand-yellow-400 ring-offset-4 ring-offset-brand-ink-50 transition-transform active:scale-95 disabled:opacity-50 disabled:ring-brand-ink-200"
      >
        {pending ? 'Saving…' : 'Clock in'}
      </button>
    </div>
  );
}

function GpsChip({ geo }: { geo: GeoState }) {
  const label =
    geo.status === 'ok'
      ? `Location tagged · ${geo.lat?.toFixed(3)}, ${geo.lng?.toFixed(3)}`
      : geo.status === 'locating'
      ? 'Finding your location…'
      : geo.status === 'denied'
      ? 'Location permission denied'
      : geo.status === 'unavailable'
      ? 'Location unavailable on this device'
      : 'Location pending';

  const tone =
    geo.status === 'ok'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : geo.status === 'locating'
      ? 'bg-brand-yellow-50 text-brand-ink-700 border-brand-yellow-200'
      : 'bg-brand-ink-100 text-brand-ink-600 border-brand-ink-200';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${tone}`}>
      <MapPin size={14} className={geo.status === 'locating' ? 'animate-pulse' : ''} />
      {label}
    </span>
  );
}

function JobCostCard({
  entry,
  detail,
}: {
  entry: TimeEntry;
  detail: OpenEntryDetail | null;
}) {
  const jobCode = entry.job ?? '—';
  const phaseCode = entry.phase ?? '—';
  const catCode = entry.cat ?? '—';
  const job = detail?.job;
  const phaseDesc = detail?.phaseDescription;
  const catDesc = detail?.catDescription;
  const worktypeLabel = job ? WORKTYPE_LABELS[job.default_worktype] ?? '—' : null;
  const locationBits = job ? [job.state, job.local].filter(Boolean).join(' · ') : '';

  return (
    <div className="w-full overflow-hidden rounded-xl border border-brand-ink-200 bg-white text-left">
      <div className="flex items-center gap-2 border-b border-brand-ink-100 bg-brand-yellow-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-brand-ink-700">
        <Briefcase size={14} className="text-brand-ink-600" />
        Working on
      </div>
      <dl className="divide-y divide-brand-ink-100 text-sm">
        <CostRow
          label="Job"
          code={jobCode}
          description={job?.description ?? null}
          meta={locationBits || worktypeLabel}
        />
        <CostRow label="Phase" code={phaseCode} description={phaseDesc} />
        <CostRow label="Category" code={catCode} description={catDesc} />
      </dl>
    </div>
  );
}

function CostRow({
  label,
  code,
  description,
  meta,
}: {
  label: string;
  code: string;
  description: string | null | undefined;
  meta?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-2">
      <dt className="w-16 shrink-0 text-xs uppercase tracking-wide text-brand-ink-500">{label}</dt>
      <dd className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded bg-brand-ink-900 px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-yellow-400">
            {code}
          </span>
          {description && (
            <span className="min-w-0 flex-1 truncate text-brand-ink-900">{description}</span>
          )}
        </div>
        {meta && <p className="mt-0.5 text-xs text-brand-ink-500">{meta}</p>}
      </dd>
    </div>
  );
}
