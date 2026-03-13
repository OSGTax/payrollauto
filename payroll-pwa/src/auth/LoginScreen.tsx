import { useState } from 'react';
import { useAuth } from './AuthProvider';

export default function LoginScreen() {
  const { login } = useAuth();
  const [empId, setEmpId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(empId.trim(), pin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">CrewClock</h1>
          <p className="text-slate-400">Sign in to start tracking time</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Employee ID</label>
            <input
              type="text"
              value={empId}
              onChange={(e) => setEmpId(e.target.value.toUpperCase())}
              placeholder="e.g. AJKSMITH"
              className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 text-lg border border-slate-700 focus:border-brand focus:outline-none"
              autoComplete="username"
              autoCapitalize="characters"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              className="w-full bg-slate-800 text-white rounded-lg px-4 py-3 text-lg tracking-widest border border-slate-700 focus:border-brand focus:outline-none"
              autoComplete="current-password"
              maxLength={6}
              required
            />
          </div>

          {error && (
            <p className="text-danger text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !empId || !pin}
            className="w-full bg-brand hover:bg-brand-dark text-white font-semibold rounded-lg py-3 text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
