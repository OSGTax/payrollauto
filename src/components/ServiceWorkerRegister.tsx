'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { drain, subscribe } from '@/lib/offline-queue';

/**
 * Registers the service worker and orchestrates the offline action queue:
 * drains it on `online`, on tab focus, and on a slow interval. Triggers a
 * router refresh when actions sync so server-rendered pages reflect the
 * new state.
 */
export function ServiceWorkerRegister() {
  const router = useRouter();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failures are not actionable from the UI.
    });
  }, []);

  // Ask the browser to keep our IndexedDB data through storage pressure.
  // Chrome/Edge silently grant this for installed PWAs; Firefox prompts;
  // Safari ignores. Either way it's a one-shot request and we move on.
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    if (!navigator.storage || !navigator.storage.persist) return;
    navigator.storage.persisted().then((already) => {
      if (already) return;
      navigator.storage.persist().catch(() => {});
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    let pending = 0;
    const unsubscribe = subscribe((items) => {
      pending = items.length;
    });

    async function attempt() {
      if (cancelled) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (pending === 0) return;
      const { synced } = await drain();
      if (synced > 0 && !cancelled) {
        try {
          localStorage.setItem('ajk-last-sync-at', String(Date.now()));
        } catch {
          // Storage can be disabled in private mode; not fatal.
        }
        router.refresh();
      }
    }

    const onOnline = () => attempt();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') attempt();
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);
    const interval = window.setInterval(attempt, 30_000);

    // Try once on mount in case items survived a reload.
    attempt();

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, [router]);

  return null;
}
