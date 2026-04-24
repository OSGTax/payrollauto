'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISS_KEY = 'ajk-install-dismissed-at';
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (dismissed && Date.now() - dismissed < DISMISS_TTL_MS) return;

    const onBip = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);

    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  }

  async function install() {
    if (!evt) return;
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === 'accepted') setVisible(false);
    else dismiss();
  }

  if (!visible || !evt) return null;

  return (
    <div className="fixed inset-x-0 bottom-20 z-20 flex justify-center px-3 sm:bottom-4">
      <div className="flex w-full max-w-md items-center gap-3 rounded-xl border border-brand-yellow-400/50 bg-brand-ink-900 px-3 py-2 text-brand-ink-50 shadow-lg">
        <Download size={18} className="shrink-0 text-brand-yellow-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Install AJK Time</p>
          <p className="text-xs text-brand-ink-300">One-tap access from your home screen.</p>
        </div>
        <button
          onClick={install}
          className="shrink-0 rounded-lg bg-brand-yellow-400 px-3 py-1.5 text-xs font-semibold text-brand-ink-900 hover:bg-brand-yellow-500"
        >
          Install
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded p-1 text-brand-ink-300 hover:text-brand-ink-50"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
