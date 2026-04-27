'use client';

import { useEffect, useState } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { subscribe } from '@/lib/offline-queue';

/**
 * Compact status pill shown only when something is wrong: device offline
 * or queued actions waiting to sync. Hidden completely when everything is
 * normal — a quiet UI is the goal.
 */
export function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const unsubscribe = subscribe(setPending);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      unsubscribe();
    };
  }, []);

  if (online && pending === 0) return null;

  const offlineLabel = !online ? 'Offline' : null;
  const syncLabel =
    pending > 0
      ? online
        ? `Syncing ${pending} pending`
        : `${pending} saved offline`
      : null;
  const label = [offlineLabel, syncLabel].filter(Boolean).join(' · ');

  const Icon = !online ? CloudOff : RefreshCw;
  const tone = !online
    ? 'border-amber-300 bg-amber-50 text-amber-800'
    : 'border-brand-yellow-300 bg-brand-yellow-50 text-brand-ink-800';

  return (
    <div
      role="status"
      className={`pointer-events-none fixed inset-x-0 top-0 z-30 flex justify-center px-3 pt-[calc(env(safe-area-inset-top)+8px)]`}
    >
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shadow-sm ${tone}`}
      >
        <Icon size={14} className={pending > 0 && online ? 'animate-spin' : ''} />
        {label}
      </span>
    </div>
  );
}
