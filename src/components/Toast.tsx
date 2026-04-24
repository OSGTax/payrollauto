'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
type Toast = { id: number; kind: ToastKind; title: string; detail?: string };

type ToastContextValue = {
  show: (t: Omit<Toast, 'id'>) => void;
  success: (title: string, detail?: string) => void;
  error: (title: string, detail?: string) => void;
  info: (title: string, detail?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((t: Omit<Toast, 'id'>) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, ...t }]);
  }, []);

  const value: ToastContextValue = {
    show,
    success: (title, detail) => show({ kind: 'success', title, detail }),
    error: (title, detail) => show({ kind: 'error', title, detail }),
    info: (title, detail) => show({ kind: 'info', title, detail }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-3 sm:top-auto sm:bottom-28">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const ms = toast.kind === 'error' ? 6000 : 3500;
    const id = setTimeout(onDismiss, ms);
    return () => clearTimeout(id);
  }, [onDismiss, toast.kind]);

  const Icon =
    toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? AlertCircle : Info;
  const accent =
    toast.kind === 'success'
      ? 'border-emerald-400 text-emerald-400'
      : toast.kind === 'error'
      ? 'border-red-400 text-red-400'
      : 'border-brand-yellow-400 text-brand-yellow-400';

  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border-l-4 bg-brand-ink-900 px-3 py-2 text-brand-ink-50 shadow-lg animate-[toast-in_.18s_ease-out] ${accent}`}
    >
      <Icon size={20} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{toast.title}</p>
        {toast.detail && (
          <p className="mt-0.5 text-xs text-brand-ink-300 leading-snug">{toast.detail}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded p-1 text-brand-ink-300 hover:text-brand-ink-50"
      >
        <X size={16} />
      </button>
    </div>
  );
}
