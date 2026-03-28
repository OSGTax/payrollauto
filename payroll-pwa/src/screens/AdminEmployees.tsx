import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Employee, Role, WorkerClass } from '../lib/types'

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [workerClasses, setWorkerClasses] = useState<WorkerClass[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [resetPwId, setResetPwId] = useState<string | null>(null)
  const [newPw, setNewPw] = useState('')

  // Form state
  const [empId, setEmpId] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<Role>('worker')
  const [defaultClass, setDefaultClass] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const [empRes, wcRes] = await Promise.all([
      supabase.from('employees').select('*').order('full_name'),
      supabase.from('worker_classes').select('*').eq('is_active', true).order('name'),
    ])
    setEmployees(empRes.data ?? [])
    setWorkerClasses(wcRes.data ?? [])
  }

  function openCreate() {
    setEditing(null)
    setEmpId('')
    setFullName('')
    setRole('worker')
    setDefaultClass('')
    setPassword('')
    setMsg('')
    setShowForm(true)
  }

  function openEdit(emp: Employee) {
    setEditing(emp)
    setEmpId(emp.emp_id)
    setFullName(emp.full_name)
    setRole(emp.role)
    setDefaultClass(emp.default_class)
    setPassword('')
    setMsg('')
    setShowForm(true)
  }

  async function handleSave() {
    setBusy(true)
    setMsg('')

    if (editing) {
      // Update existing
      const { error } = await supabase.from('employees').update({
        full_name: fullName,
        role,
        default_class: defaultClass,
      }).eq('id', editing.id)
      if (error) { setMsg(error.message); setBusy(false); return }
    } else {
      // Create new: auth user + employee record
      if (!empId || !fullName || !password) {
        setMsg('All fields required')
        setBusy(false)
        return
      }
      const email = `${empId.toLowerCase()}@crew.local`

      // Create auth user via admin API (using edge function or direct)
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (authErr) {
        // Fallback: try signUp
        const { error: signUpErr } = await supabase.auth.signUp({ email, password })
        if (signUpErr) { setMsg(signUpErr.message); setBusy(false); return }
      }
      void authData

      const { error } = await supabase.from('employees').insert({
        emp_id: empId.toUpperCase(),
        full_name: fullName,
        role,
        default_class: defaultClass || 'LAB GEN',
      })
      if (error) { setMsg(error.message); setBusy(false); return }
    }

    setBusy(false)
    setShowForm(false)
    load()
  }

  async function toggleActive(emp: Employee) {
    await supabase.from('employees').update({ is_active: !emp.is_active }).eq('id', emp.id)
    load()
  }

  async function handleResetPassword() {
    if (!resetPwId || !newPw) return
    setBusy(true)
    const emp = employees.find((e) => e.id === resetPwId)
    if (!emp) { setBusy(false); return }

    const email = `${emp.emp_id.toLowerCase()}@crew.local`
    // Get user by email, then update password
    const { data: users } = await supabase.auth.admin.listUsers()
    const authUser = users?.users?.find((u) => u.email === email)
    if (authUser) {
      await supabase.auth.admin.updateUserById(authUser.id, { password: newPw })
    }
    setBusy(false)
    setResetPwId(null)
    setNewPw('')
    alert('Password reset successfully')
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white font-semibold">Employees ({employees.length})</h2>
        <button onClick={openCreate} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg">
          + Add Employee
        </button>
      </div>

      {employees.map((emp) => (
        <div key={emp.id} className={`mb-2 p-3 rounded-lg border ${emp.is_active ? 'bg-slate-900 border-slate-800' : 'bg-slate-900/50 border-slate-800/50 opacity-60'}`}>
          <div className="flex justify-between items-center">
            <div>
              <span className="text-white text-sm font-medium">{emp.full_name}</span>
              <span className="text-xs text-slate-400 ml-2">{emp.emp_id}</span>
              <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${
                emp.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                emp.role === 'manager' ? 'bg-blue-500/20 text-blue-400' :
                'bg-slate-700 text-slate-400'
              }`}>{emp.role}</span>
              <span className="text-xs text-slate-500 ml-2">{emp.default_class}</span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(emp)} className="text-xs px-2 py-1 bg-slate-800 text-slate-300 rounded">Edit</button>
              <button onClick={() => { setResetPwId(emp.id); setNewPw('') }} className="text-xs px-2 py-1 bg-slate-800 text-slate-300 rounded">PW</button>
              <button onClick={() => toggleActive(emp)} className={`text-xs px-2 py-1 rounded ${emp.is_active ? 'bg-orange-600 text-white' : 'bg-green-600 text-white'}`}>
                {emp.is_active ? 'Deact' : 'Activ'}
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Create/Edit form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl p-4 w-full max-w-sm border border-slate-700">
            <h3 className="text-white font-semibold mb-3">{editing ? 'Edit Employee' : 'New Employee'}</h3>
            {!editing && (
              <>
                <label className="block text-xs text-slate-400 mb-1">Employee ID</label>
                <input value={empId} onChange={(e) => setEmpId(e.target.value.toUpperCase())} placeholder="AJKSMITH"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm mb-2" />
              </>
            )}
            <label className="block text-xs text-slate-400 mb-1">Full Name</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Smith"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm mb-2" />

            <label className="block text-xs text-slate-400 mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm mb-2">
              <option value="worker">Worker</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>

            <label className="block text-xs text-slate-400 mb-1">Default Worker Class</label>
            <select value={defaultClass} onChange={(e) => setDefaultClass(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm mb-2">
              <option value="">Select...</option>
              {workerClasses.map((wc) => <option key={wc.id} value={wc.name}>{wc.name}</option>)}
            </select>

            {!editing && (
              <>
                <label className="block text-xs text-slate-400 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Initial password"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm mb-2" />
              </>
            )}

            {msg && <p className="text-red-400 text-xs mb-2">{msg}</p>}

            <div className="flex gap-2 mt-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={busy} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
                {busy ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password reset modal */}
      {resetPwId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl p-4 w-full max-w-sm border border-slate-700">
            <h3 className="text-white font-semibold mb-3">Reset Password</h3>
            <p className="text-xs text-slate-400 mb-2">
              For: {employees.find((e) => e.id === resetPwId)?.full_name}
            </p>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="New password"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setResetPwId(null)} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm">Cancel</button>
              <button onClick={handleResetPassword} disabled={busy || !newPw} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
