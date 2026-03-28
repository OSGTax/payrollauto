import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [empId, setEmpId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!empId || !password) return
    setError('')
    setBusy(true)
    const err = await signIn(empId.trim(), password)
    if (err) setError('Invalid credentials')
    setBusy(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6">
      <img src="/favicon.svg" alt="AJK Construction" className="w-20 h-20 rounded-xl mb-4" />
      <h1 className="text-2xl font-bold text-white mb-1">CrewClock</h1>
      <p className="text-sm text-slate-400 mb-8">AJK Construction Time Tracking</p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Employee ID</label>
          <input
            type="text"
            value={empId}
            onChange={(e) => setEmpId(e.target.value.toUpperCase())}
            placeholder="AJKSMITH"
            autoCapitalize="characters"
            autoComplete="username"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white text-lg placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white text-lg placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
          />
        </div>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={busy || !empId || !password}
          className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold text-lg hover:bg-blue-500 disabled:opacity-50 transition"
        >
          {busy ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
