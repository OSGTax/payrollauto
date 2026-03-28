import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function SettingsScreen() {
  const { employee } = useAuth()
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function changePassword() {
    if (!newPw) return
    setBusy(true)
    setMsg('')

    // Verify old password by re-authenticating
    const email = `${employee!.emp_id.toLowerCase()}@crew.local`
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: oldPw })
    if (authErr) {
      setMsg('Current password is incorrect')
      setBusy(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPw })
    if (error) {
      setMsg(error.message)
    } else {
      setMsg('Password updated successfully')
      setOldPw('')
      setNewPw('')
    }
    setBusy(false)
  }

  return (
    <div className="p-4">
      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 mb-4">
        <h3 className="text-white font-semibold mb-3">Account</h3>
        <div className="text-sm text-slate-300">{employee?.full_name}</div>
        <div className="text-xs text-slate-400">{employee?.emp_id}</div>
        <div className="text-xs text-slate-500 mt-1">
          Role: <span className="text-slate-300">{employee?.role}</span>
        </div>
        <div className="text-xs text-slate-500">
          Default Class: <span className="text-slate-300">{employee?.default_class}</span>
        </div>
      </div>

      <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
        <h3 className="text-white font-semibold mb-3">Change Password</h3>
        <input
          type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)}
          placeholder="Current password"
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm mb-2"
        />
        <input
          type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
          placeholder="New password"
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm mb-2"
        />
        {msg && <p className={`text-xs mb-2 ${msg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
        <button
          onClick={changePassword}
          disabled={busy || !oldPw || !newPw}
          className="w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          {busy ? 'Updating...' : 'Update Password'}
        </button>
      </div>

      <div className="text-center text-xs text-slate-600 mt-6">CrewClock v2.0.0</div>
    </div>
  )
}
