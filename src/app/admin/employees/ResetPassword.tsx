'use client';

import { useState, useTransition } from 'react';
import { resetPassword } from './actions';

export function ResetPassword({ employeeId }: { employeeId: string }) {
  const [pending, startTransition] = useTransition();
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  function submit() {
    setStatus(null);
    if (password.length < 8) { setStatus('Min 8 characters.'); return; }
    startTransition(async () => {
      const res = await resetPassword(employeeId, password);
      if (res?.error) setStatus(res.error);
      else {
        setStatus('Password reset.');
        setPassword('');
      }
    });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        type="text"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
        className="flex-1 rounded-lg border border-brand-ink-200 bg-white px-3 py-2"
      />
      <button
        onClick={submit}
        disabled={pending}
        className="rounded-lg bg-brand-yellow-400 hover:bg-brand-yellow-500 px-4 py-2 font-medium text-brand-ink-900 disabled:opacity-50"
      >
        {pending ? 'Resetting…' : 'Reset'}
      </button>
      {status && <p className="self-center text-sm text-brand-ink-600">{status}</p>}
    </div>
  );
}
