'use client';

/**
 * Offline action queue for the four worker clock operations.
 *
 * When a clock action is invoked while the device is offline (or the network
 * call throws), the action is persisted in IndexedDB instead of failing. A
 * drain loop replays the queue when connectivity returns. Each queued action
 * carries the original tap timestamp so that — even if it syncs hours later —
 * the time it records on the entry is the moment the worker actually tapped.
 *
 * Scope: only the four clock actions are wrapped here. Photo uploads, change
 * requests, and admin actions still require network at call time.
 */

import {
  clockIn,
  clockOut,
  takeBreak,
  switchWorkCode,
} from '@/app/(worker)/clock/actions';

type ClockInPayload = Parameters<typeof clockIn>[0];
type ClockOutPayload = Parameters<typeof clockOut>[0];
type TakeBreakPayload = Parameters<typeof takeBreak>[0];
type SwitchWorkCodePayload = Parameters<typeof switchWorkCode>[0];

type Meta = { id: number; queuedAt: number; attempts: number; lastError?: string };

export type NewAction =
  | { kind: 'clockIn'; payload: ClockInPayload }
  | { kind: 'clockOut'; payload: ClockOutPayload }
  | { kind: 'takeBreak'; payload: TakeBreakPayload }
  | { kind: 'switchWorkCode'; payload: SwitchWorkCodePayload };

export type QueuedAction = NewAction & Meta;

const DB_NAME = 'ajk-time-offline';
const DB_VERSION = 1;
const STORE = 'actions';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
  return db.transaction(STORE, mode).objectStore(STORE);
}

async function add(action: NewAction): Promise<QueuedAction> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const store = tx(db, 'readwrite');
    const record = { ...action, queuedAt: Date.now(), attempts: 0 };
    const req = store.add(record);
    req.onsuccess = () => resolve({ ...record, id: req.result as number } as QueuedAction);
    req.onerror = () => reject(req.error);
  });
}

async function remove(id: number): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function update(action: QueuedAction): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readwrite').put(action);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function listPending(): Promise<QueuedAction[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = tx(db, 'readonly').getAll();
    req.onsuccess = () => {
      const all = (req.result as QueuedAction[]).slice();
      all.sort((a, b) => a.queuedAt - b.queuedAt);
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}

// --- Subscriptions ------------------------------------------------------

type Listener = (count: number) => void;
const listeners = new Set<Listener>();

async function notify() {
  const items = await listPending();
  for (const fn of listeners) fn(items.length);
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  // Push current count immediately.
  listPending().then((items) => fn(items.length));
  return () => listeners.delete(fn);
}

// --- Dispatch -----------------------------------------------------------

async function dispatch(
  action: QueuedAction | NewAction,
): Promise<{ ok: true; result: Awaited<ReturnType<typeof clockIn>> } | { ok: true; result: Awaited<ReturnType<typeof clockOut>> } | { ok: true; result: Awaited<ReturnType<typeof takeBreak>> } | { ok: true; result: Awaited<ReturnType<typeof switchWorkCode>> }> {
  switch (action.kind) {
    case 'clockIn':
      return { ok: true, result: await clockIn(action.payload) };
    case 'clockOut':
      return { ok: true, result: await clockOut(action.payload) };
    case 'takeBreak':
      return { ok: true, result: await takeBreak(action.payload) };
    case 'switchWorkCode':
      return { ok: true, result: await switchWorkCode(action.payload) };
  }
}

function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (!(e instanceof Error)) return false;
  return /network|fetch|failed to fetch|load failed|connection|offline/i.test(e.message);
}

/**
 * Try the server action. On network failure or while offline, persist the
 * action and return a `queued` marker so the UI can show "saved offline".
 * Logical errors from the server (e.g. "Entry not found") are NOT queued —
 * those need surfacing.
 */
export async function runOrQueue(
  action: NewAction,
): Promise<
  | { ok: true; result: unknown }
  | { queued: true; queuedAt: number }
> {
  // Already offline — don't even attempt.
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const rec = await add(action);
    void notify();
    return { queued: true, queuedAt: rec.queuedAt };
  }

  try {
    const out = await dispatch(action);
    return { ok: true, result: out.result };
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    const rec = await add(action);
    void notify();
    return { queued: true, queuedAt: rec.queuedAt };
  }
}

let draining = false;

/**
 * Replay the queue in FIFO order. Stops at the first action that fails with
 * what looks like a network error so that ordering is preserved on the next
 * attempt. Logical errors (e.g. the entry was deleted server-side) drop the
 * action so the queue can't get stuck on a permanently-bad record.
 */
export async function drain(): Promise<{ synced: number; remaining: number }> {
  if (draining) return { synced: 0, remaining: (await listPending()).length };
  draining = true;
  let synced = 0;
  try {
    const queue = await listPending();
    for (const item of queue) {
      try {
        const out = await dispatch(item);
        // Server may still return a logical error in the result envelope.
        const result = out.result as { error?: string };
        if (result?.error) {
          item.attempts += 1;
          item.lastError = result.error;
          await update(item);
          // Treat as poison if it failed twice in a row with the same logical
          // error; otherwise leave it for a manual retry pass.
          if (item.attempts >= 3) await remove(item.id);
          break;
        }
        await remove(item.id);
        synced += 1;
      } catch (e) {
        if (isNetworkError(e)) {
          item.attempts += 1;
          item.lastError = e instanceof Error ? e.message : String(e);
          await update(item);
          break;
        }
        // Unexpected error — drop the action so the queue isn't stuck.
        await remove(item.id);
      }
    }
  } finally {
    draining = false;
    await notify();
  }
  const remaining = (await listPending()).length;
  return { synced, remaining };
}

