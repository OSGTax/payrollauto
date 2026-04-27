'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Briefcase, Coffee, Shuffle, X, CloudOff } from 'lucide-react';
import { JobPicker } from '@/components/JobPicker';
import { useToast } from '@/components/Toast';
import { formatTime12h } from '@/lib/time';
import { easternDateTime, parseEasternWallClock } from '@/lib/tz';
import { patchEntryLocation } from './actions';
import {
  runOrQueue,
  subscribe as subscribeQueue,
  syntheticEntryId,
  type QueuedAction,
} from '@/lib/offline-queue';
import type { Job, TimeEntry } from '@/lib/types';
import type { OpenEntryDetail } from './page';
import { format } from 'date-fns';

type Codes = { job: string; phase: string; cat: string };

type Props = {
  employee: { id: string; first_name: string };
  openEntry: TimeEntry | null;
  openEntryDetail?: OpenEntryDetail | null;
  jobs: Job[];
  lastCodes?: Codes | null;
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

/**
 * Build a placeholder TimeEntry from a queued clockIn / switchWorkCode so the
 * UI can show "On the clock" the instant the worker taps, even with no signal.
 * Most fields default to nulls — the actual server insert will fill them in.
 */
function synthesizeEntry(
  item: QueuedAction & { kind: 'clockIn' | 'switchWorkCode' },
  employeeId: string,
): TimeEntry {
  const tap = item.payload.client_at_iso
    ? new Date(item.payload.client_at_iso)
    : new Date(item.queuedAt);
  const { date, time } = easternDateTime(tap);
  return {
    id: syntheticEntryId(item.queuedAt),
    employee_id: employeeId,
    date,
    start_time: time,
    end_time: null,
    hours: 0,
    type: 1,
    otmult: null,
    job: item.payload.job,
    phase: item.payload.phase,
    cat: item.payload.cat,
    class: null,
    department: null,
    worktype: null,
    wcomp1: null,
    wcomp2: null,
    rate: null,
    notes: null,
    voice_text: null,
    clock_in_lat: item.payload.lat,
    clock_in_lng: item.payload.lng,
    clock_out_lat: null,
    clock_out_lng: null,
    status: 'draft',
    approved_by: null,
    approved_at: null,
    locked_at: null,
    exported_at: null,
    created_by: employeeId,
    created_at: tap.toISOString(),
    edited_by: null,
    edited_at: null,
    client_op_id: null,
  };
}

/**
 * Replay queued actions on top of the server's open-entry snapshot to derive
 * what the worker should currently see. Returns whether the resulting entry
 * is optimistic (queued and not yet synced).
 */
function deriveEffectiveEntry(
  serverEntry: TimeEntry | null,
  queue: QueuedAction[],
  employeeId: string,
): { entry: TimeEntry | null; optimistic: boolean } {
  let entry: TimeEntry | null = serverEntry;
  let optimistic = false;
  for (const item of queue) {
    switch (item.kind) {
      case 'clockIn':
        if (!entry) {
          entry = synthesizeEntry(item, employeeId);
          optimistic = true;
        }
        break;
      case 'clockOut':
      case 'takeBreak':
        if (entry) {
          entry = null;
          optimistic = false;
        }
        break;
      case 'switchWorkCode':
        if (entry) {
          entry = synthesizeEntry(item, employeeId);
          optimistic = true;
        }
        break;
    }
  }
  return { entry, optimistic };
}

export function ClockPanel({ employee, openEntry, openEntryDetail, jobs, lastCodes }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [pickedJob, setPickedJob] = useState<string | null>(lastCodes?.job ?? null);
  const [pickedPhase, setPickedPhase] = useState<string | null>(lastCodes?.phase ?? null);
  const [pickedCat, setPickedCat] = useState<string | null>(lastCodes?.cat ?? null);
  const [geo, setGeo] = useState<GeoState>({ status: 'idle' });
  const [pulseKey, setPulseKey] = useState(0);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switchJob, setSwitchJob] = useState<string | null>(null);
  const [switchPhase, setSwitchPhase] = useState<string | null>(null);
  const [switchCat, setSwitchCat] = useState<string | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const [queueItems, setQueueItems] = useState<QueuedAction[]>([]);
  useEffect(() => subscribeQueue(setQueueItems), []);

  const { entry: effectiveEntry, optimistic: entryIsOptimistic } = useMemo(
    () => deriveEffectiveEntry(openEntry, queueItems, employee.id),
    [openEntry, queueItems, employee.id],
  );
  const isClockedIn = !!effectiveEntry;

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

  // Snapshot the cached fix at the moment of a button tap. If the warm-up
  // already produced coords, we use them and skip waiting on GPS entirely;
  // otherwise the caller fires a fresh request in parallel with the action.
  function cachedCoords(): { lat: number; lng: number } | null {
    if (geo.status === 'ok' && geo.lat != null && geo.lng != null) {
      return { lat: geo.lat, lng: geo.lng };
    }
    return null;
  }

  // Live elapsed counter while clocked in.
  const [elapsed, setElapsed] = useState('00:00:00');
  useEffect(() => {
    if (!isClockedIn || !effectiveEntry) return;
    const startMs = startMsFromEntry(effectiveEntry);
    const id = setInterval(() => setElapsed(formatElapsed(startMs)), 1000);
    setElapsed(formatElapsed(startMs));
    return () => clearInterval(id);
  }, [isClockedIn, effectiveEntry]);

  function handleClockIn() {
    if (!pickedJob || !pickedPhase || !pickedCat) {
      toast.error('Pick a job, phase, and category first.');
      return;
    }
    buzz(40);
    setPulseKey((k) => k + 1);
    const cached = cachedCoords();
    const fresh = cached ? null : geolocate();
    const tappedAt = new Date().toISOString();
    const opId = crypto.randomUUID();
    startTransition(async () => {
      const out = await runOrQueue({
        kind: 'clockIn',
        payload: {
          job: pickedJob,
          phase: pickedPhase,
          cat: pickedCat,
          lat: cached?.lat ?? null,
          lng: cached?.lng ?? null,
          client_at_iso: tappedAt,
          client_op_id: opId,
        },
      });
      if ('queued' in out) {
        buzz([30, 30, 30]);
        toast.info('Saved offline', 'Will sync when you have signal.');
        return;
      }
      const res = out.result as { error?: string; entryId?: string };
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
      if (fresh && res.entryId) {
        const c = await fresh;
        if (c) {
          void patchEntryLocation({ entryId: res.entryId, kind: 'clock_in', lat: c.lat, lng: c.lng });
        }
      }
    });
  }

  function handleClockOut() {
    if (!effectiveEntry) return;
    const entryId = effectiveEntry.id;
    buzz(40);
    setPulseKey((k) => k + 1);
    const cached = cachedCoords();
    const fresh = cached ? null : geolocate();
    const tappedAt = new Date().toISOString();
    startTransition(async () => {
      const out = await runOrQueue({
        kind: 'clockOut',
        payload: {
          entryId,
          lat: cached?.lat ?? null,
          lng: cached?.lng ?? null,
          client_at_iso: tappedAt,
        },
      });
      if ('queued' in out) {
        buzz([30, 30, 30]);
        toast.info('Saved offline', 'Will sync when you have signal.');
        return;
      }
      const res = out.result as { error?: string };
      if (res?.error) {
        toast.error('Could not clock out', res.error);
        buzz([20, 40, 20]);
        return;
      }
      buzz([60, 40, 30]);
      toast.success(`Clocked out · ${format(new Date(), 'h:mm a')}`, `Total: ${elapsed}`);
      router.refresh();
      if (fresh) {
        const c = await fresh;
        if (c) {
          void patchEntryLocation({ entryId, kind: 'clock_out', lat: c.lat, lng: c.lng });
        }
      }
    });
  }

  function handleTakeBreak() {
    if (!effectiveEntry) return;
    const entryId = effectiveEntry.id;
    buzz(30);
    const cached = cachedCoords();
    const fresh = cached ? null : geolocate();
    const tappedAt = new Date().toISOString();
    startTransition(async () => {
      const out = await runOrQueue({
        kind: 'takeBreak',
        payload: {
          entryId,
          lat: cached?.lat ?? null,
          lng: cached?.lng ?? null,
          client_at_iso: tappedAt,
        },
      });
      if ('queued' in out) {
        toast.info('Saved offline', 'Break will register when you have signal.');
        return;
      }
      const res = out.result as { error?: string };
      if (res?.error) {
        toast.error('Could not start break', res.error);
        return;
      }
      toast.success('Enjoy your break', `Total so far: ${elapsed}`);
      router.refresh();
      if (fresh) {
        const c = await fresh;
        if (c) {
          void patchEntryLocation({ entryId, kind: 'clock_out', lat: c.lat, lng: c.lng });
        }
      }
    });
  }

  function openSwitcher() {
    if (!effectiveEntry) return;
    setSwitchJob(effectiveEntry.job ?? null);
    setSwitchPhase(effectiveEntry.phase ?? null);
    setSwitchCat(effectiveEntry.cat ?? null);
    setSwitcherOpen(true);
  }

  function handleSwitchWorkCode() {
    if (!effectiveEntry) return;
    if (!switchJob || !switchPhase || !switchCat) {
      toast.error('Pick a job, phase, and category first.');
      return;
    }
    const sameAsCurrent =
      switchJob === effectiveEntry.job &&
      switchPhase === effectiveEntry.phase &&
      switchCat === effectiveEntry.cat;
    if (sameAsCurrent) {
      setSwitcherOpen(false);
      return;
    }
    const oldEntryId = effectiveEntry.id;
    buzz(30);
    const cached = cachedCoords();
    // Switch closes the old entry and opens a new one. We can patch the old
    // entry's clock_out coords if GPS arrives late; the new entry's clock_in
    // coords aren't patchable here without an RPC change, so cached coords are
    // its only chance.
    const fresh = cached ? null : geolocate();
    const tappedAt = new Date().toISOString();
    const opId = crypto.randomUUID();
    startTransition(async () => {
      const out = await runOrQueue({
        kind: 'switchWorkCode',
        payload: {
          entryId: oldEntryId,
          job: switchJob,
          phase: switchPhase,
          cat: switchCat,
          lat: cached?.lat ?? null,
          lng: cached?.lng ?? null,
          client_at_iso: tappedAt,
          client_op_id: opId,
        },
      });
      if ('queued' in out) {
        toast.info('Saved offline', 'Switch will register when you have signal.');
        setSwitcherOpen(false);
        return;
      }
      const res = out.result as { error?: string };
      if (res?.error) {
        toast.error('Could not switch code', res.error);
        return;
      }
      toast.success('Switched work code', `Now on ${switchJob} · ${switchPhase} · ${switchCat}`);
      setSwitcherOpen(false);
      router.refresh();
      if (fresh) {
        const c = await fresh;
        if (c) {
          void patchEntryLocation({ entryId: oldEntryId, kind: 'clock_out', lat: c.lat, lng: c.lng });
        }
      }
    });
  }

  if (isClockedIn && effectiveEntry) {
    const startedAtLabel = formatTime12h(effectiveEntry.start_time, '--:-- --');
    // The server-side phase/category descriptions only apply when the entry
    // matches what's on the server. Once a queued action has changed the open
    // entry, fall back to showing codes only.
    const detail =
      entryIsOptimistic ||
      !openEntry ||
      openEntry.id !== effectiveEntry.id
        ? null
        : openEntryDetail ?? null;
    return (
      <div className="flex flex-col items-center gap-5 pt-6 text-center">
        <p className="text-xs uppercase tracking-widest text-brand-ink-500">On the clock</p>
        {entryIsOptimistic && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-yellow-300 bg-brand-yellow-50 px-3 py-1 text-xs font-medium text-brand-ink-800">
            <CloudOff size={14} />
            Pending sync — saved on this phone
          </span>
        )}
        <p
          className="font-mono text-6xl font-bold tabular-nums text-brand-ink-900"
          aria-live="polite"
        >
          {elapsed}
        </p>
        <p className="text-xs text-brand-ink-500">
          Started at <span className="font-medium text-brand-ink-700">{startedAtLabel}</span>
        </p>

        <JobCostCard entry={effectiveEntry} detail={detail} />

        {switcherOpen && (
          <div className="w-full rounded-xl border border-brand-yellow-400 bg-white p-3 text-left shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-brand-ink-900">Switch to a new code</p>
              <button
                type="button"
                onClick={() => setSwitcherOpen(false)}
                aria-label="Cancel"
                className="rounded p-1 text-brand-ink-500 hover:text-brand-ink-900"
              >
                <X size={16} />
              </button>
            </div>
            <JobPicker
              jobs={jobs}
              value={{ job: switchJob, phase: switchPhase, cat: switchCat }}
              onChange={(v) => {
                setSwitchJob(v.job);
                setSwitchPhase(v.phase);
                setSwitchCat(v.cat);
              }}
            />
            <button
              type="button"
              onClick={handleSwitchWorkCode}
              disabled={pending || !switchJob || !switchPhase || !switchCat}
              className="mt-3 w-full rounded-lg bg-brand-yellow-400 px-4 py-2 text-sm font-semibold text-brand-ink-900 hover:bg-brand-yellow-500 disabled:opacity-50"
            >
              {pending ? 'Switching…' : 'Switch now'}
            </button>
            <p className="mt-2 text-center text-xs text-brand-ink-500">
              Closes this entry and opens a new one at the current time.
            </p>
          </div>
        )}

        <div className="flex w-full items-stretch justify-center gap-2">
          <button
            type="button"
            onClick={handleTakeBreak}
            disabled={pending || switcherOpen}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-brand-ink-300 bg-white px-3 py-2 text-sm font-medium text-brand-ink-700 hover:bg-brand-ink-100 disabled:opacity-50"
          >
            <Coffee size={16} />
            Take a break
          </button>
          <button
            type="button"
            onClick={openSwitcher}
            disabled={pending || switcherOpen}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-brand-yellow-400 bg-brand-yellow-50 px-3 py-2 text-sm font-medium text-brand-ink-800 hover:bg-brand-yellow-100 disabled:opacity-50"
          >
            <Shuffle size={16} />
            Switch code
          </button>
        </div>

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
