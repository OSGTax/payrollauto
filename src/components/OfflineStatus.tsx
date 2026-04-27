'use client';

import { useEffect, useState } from 'react';
import { CloudOff, RefreshCw, Cloud } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { subscribe } from '@/lib/offline-queue';

const LAST_SYNC_KEY = 'ajk-last-sync-at';
const JUST_SYNCED_WINDOW_MS = 60_000;

/**
 * Compact status pill anchored to the top of the screen. Shown when:
 *   - the device is offline, or
 *   - actions are waiting to sync, or
 *   - actions just synced (briefly, so the worker sees confirmation).
 * Otherwise hidden — a quiet UI is the goal.
 */
export function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [oldestQueuedAt, setOldestQueuedAt] = useState<number | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => 0);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const unsubscribe = subscribe((items) => {
      setPending(items.length);
      setOldestQueuedAt(items.length ? items[0].queuedAt : null);
    });

    // Read last-sync timestamp from storage and watch for updates from the
    // ServiceWorkerRegister drain loop (storage events fire across tabs).
    try {
      const raw = localStorage.getItem(LAST_SYNC_KEY);
      if (raw) setLastSyncAt(Number(raw));
    } catch {
      // ignore
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === LAST_SYNC_KEY && e.newValue) setLastSyncAt(Number(e.newValue));
    };
    window.addEventListener('storage', onStorage);

    // Poll once per minute to refresh relative timestamps.
    setNow(Date.now());
    const tick = window.setInterval(() => setNow(Date.now()), 60_000);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('storage', onStorage);
      window.clearInterval(tick);
      unsubscribe();
    };
  }, []);

  // ServiceWorkerRegister writes localStorage on the same tab too — pick that
  // up by re-reading whenever pending count drops to zero.
  useEffect(() => {
    if (pending === 0) {
      try {
        const raw = localStorage.getItem(LAST_SYNC_KEY);
        if (raw) setLastSyncAt(Number(raw));
      } catch {
        // ignore
      }
    }
  }, [pending]);

  const justSynced =
    pending === 0 &&
    online &&
    lastSyncAt !== null &&
    now > 0 &&
    now - lastSyncAt < JUST_SYNCED_WINDOW_MS;

  if (online && pending === 0 && !justSynced) return null;

  let label: string;
  let Icon = RefreshCw;
  let tone = 'border-brand-yellow-300 bg-brand-yellow-50 text-brand-ink-800';
  let spin = false;

  if (justSynced) {
    label = `Synced ${formatDistanceToNow(lastSyncAt!, { addSuffix: true })}`;
    Icon = Cloud;
    tone = 'border-emerald-300 bg-emerald-50 text-emerald-800';
  } else if (!online && pending > 0 && oldestQueuedAt !== null) {
    label = `${pending} saved offline · since ${formatDistanceToNow(oldestQueuedAt, {
      addSuffix: true,
    })}`;
    Icon = CloudOff;
    tone = 'border-amber-300 bg-amber-50 text-amber-800';
  } else if (!online) {
    label = 'Offline';
    Icon = CloudOff;
    tone = 'border-amber-300 bg-amber-50 text-amber-800';
  } else {
    label = `Syncing ${pending} pending`;
    Icon = RefreshCw;
    spin = true;
  }

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center px-3 pt-[calc(env(safe-area-inset-top)+8px)]"
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shadow-sm ${tone}`}
      >
        <Icon size={14} className={spin ? 'animate-spin' : ''} />
        {label}
      </span>
    </div>
  );
}
