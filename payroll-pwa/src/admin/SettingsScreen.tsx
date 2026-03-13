import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../db/supabase';

export default function SettingsScreen() {
  const { employee } = useAuth();
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [msg, setMsg] = useState('');
  const [changing, setChanging] = useState(false);

  async function handleChangePin(e: React.FormEvent) {
    e.preventDefault();
    if (newPin !== confirmPin) {
      setMsg('PINs do not match');
      return;
    }
    if (newPin.length < 4) {
      setMsg('PIN must be at least 4 digits');
      return;
    }
    setChanging(true);
    setMsg('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPin });
      if (error) throw error;
      setMsg('PIN updated successfully');
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed to update PIN');
    } finally {
      setChanging(false);
    }
  }

  return (
    <div className="p-4 max-w-sm mx-auto space-y-6">
      <div className="bg-surface rounded-xl p-4">
        <h2 className="text-lg font-medium text-white mb-1">Account</h2>
        <div className="text-sm text-slate-400 space-y-1">
          <div>Name: {employee?.full_name}</div>
          <div>ID: {employee?.emp_id}</div>
          <div>Role: {employee?.role}</div>
          <div>Default Class: {employee?.default_class}</div>
        </div>
      </div>

      <form onSubmit={handleChangePin} className="bg-surface rounded-xl p-4 space-y-3">
        <h2 className="text-lg font-medium text-white">Change PIN</h2>
        <input
          type="password"
          inputMode="numeric"
          placeholder="Current PIN"
          value={oldPin}
          onChange={(e) => setOldPin(e.target.value)}
          className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 border border-slate-700 focus:border-brand focus:outline-none"
          maxLength={6}
          required
        />
        <input
          type="password"
          inputMode="numeric"
          placeholder="New PIN"
          value={newPin}
          onChange={(e) => setNewPin(e.target.value)}
          className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 border border-slate-700 focus:border-brand focus:outline-none"
          maxLength={6}
          required
        />
        <input
          type="password"
          inputMode="numeric"
          placeholder="Confirm New PIN"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value)}
          className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 border border-slate-700 focus:border-brand focus:outline-none"
          maxLength={6}
          required
        />
        {msg && (
          <p className={`text-sm ${msg.includes('success') ? 'text-success' : 'text-danger'}`}>
            {msg}
          </p>
        )}
        <button
          type="submit"
          disabled={changing}
          className="w-full bg-brand text-white py-3 rounded-lg font-medium disabled:opacity-50"
        >
          {changing ? 'Updating...' : 'Update PIN'}
        </button>
      </form>

      <div className="bg-surface rounded-xl p-4">
        <h2 className="text-lg font-medium text-white mb-2">About</h2>
        <p className="text-sm text-slate-400">CrewClock v1.0.0</p>
        <p className="text-sm text-slate-500">Time tracking for construction crews</p>
      </div>
    </div>
  );
}
