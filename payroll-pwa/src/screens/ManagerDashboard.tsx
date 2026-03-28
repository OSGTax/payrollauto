import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Employee, TimeEntry, TimeChangeRequest, WorkerClass, Project, Category } from '../lib/types'
import { useWeekDates } from '../hooks/useWeekDates'

export default function ManagerDashboard() {
  const { employee: me } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const { monday, sunday } = useWeekDates(weekOffset)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [changeRequests, setChangeRequests] = useState<TimeChangeRequest[]>([])
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<string | null>(null)
  const [workerClasses, setWorkerClasses] = useState<WorkerClass[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // Edit state
  const [editProjectId, setEditProjectId] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editClassId, setEditClassId] = useState('')

  const load = useCallback(async () => {
    const [empRes, entryRes, crRes, wcRes, projRes, catRes] = await Promise.all([
      supabase.from('employees').select('*').eq('is_active', true).order('full_name'),
      supabase.from('time_entries').select(`
        *,
        project:projects(project_num, name),
        category:categories(description, cat_code, phases!inner(phase_code, project_id)),
        worker_class:worker_classes(name)
      `).gte('clock_in', monday.toISOString()).lte('clock_in', sunday.toISOString()).order('clock_in'),
      supabase.from('time_change_requests').select('*, requester:employees!requested_by(full_name)').eq('status', 'pending'),
      supabase.from('worker_classes').select('*').eq('is_active', true).order('name'),
      supabase.from('projects').select('*').eq('is_active', true).order('project_num'),
      supabase.from('categories').select('*, phases!inner(id, phase_code, project_id)').eq('is_active', true),
    ])
    setEmployees(empRes.data ?? [])
    setEntries(entryRes.data ?? [])
    setChangeRequests(crRes.data ?? [])
    setWorkerClasses(wcRes.data ?? [])
    setProjects(projRes.data ?? [])
    setCategories((catRes.data ?? []).map((c: Record<string, unknown>) => {
      const ph = c.phases as { id: string; phase_code: string; project_id: string }
      return { ...c, phase_id: ph.id, phase_code: ph.phase_code, project_id: ph.project_id }
    }) as Category[])
  }, [monday, sunday])

  useEffect(() => { load() }, [load])

  function getEmployeeEntries(empId: string) {
    const emp = employees.find((e) => e.id === empId)
    if (!emp) return []
    return entries.filter((e) => e.employee_id === empId && e.activity_type !== 'break')
  }

  function getEmployeeHours(empId: string): number {
    return getEmployeeEntries(empId)
      .filter((e) => e.clock_out)
      .reduce((sum, e) => sum + (new Date(e.clock_out!).getTime() - new Date(e.clock_in).getTime()) / 3600000, 0)
  }

  function isAllApproved(empId: string): boolean {
    const empEntries = getEmployeeEntries(empId)
    return empEntries.length > 0 && empEntries.every((e) => e.status === 'approved')
  }

  async function approveAll(empId: string) {
    const ids = getEmployeeEntries(empId).map((e) => e.id)
    if (ids.length === 0) return
    await supabase.from('time_entries').update({
      status: 'approved',
      reviewed_by: me!.id,
      reviewed_at: new Date().toISOString(),
    }).in('id', ids)
    load()
  }

  async function approveEntry(entryId: string) {
    await supabase.from('time_entries').update({
      status: 'approved',
      reviewed_by: me!.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', entryId)
    load()
  }

  async function flagEntry(entryId: string) {
    await supabase.from('time_entries').update({
      status: 'flagged',
      reviewed_by: me!.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', entryId)
    load()
  }

  function startEdit(entry: TimeEntry) {
    setEditingEntry(entry.id)
    setEditProjectId(entry.project_id ?? '')
    setEditCategoryId(entry.category_id ?? '')
    setEditClassId(entry.worker_class_id ?? '')
  }

  async function saveEdit(entryId: string) {
    await supabase.from('time_entries').update({
      project_id: editProjectId || null,
      category_id: editCategoryId || null,
      worker_class_id: editClassId || null,
    }).eq('id', entryId)
    setEditingEntry(null)
    load()
  }

  async function handleChangeRequest(requestId: string, action: 'approved' | 'denied') {
    await supabase.from('time_change_requests').update({
      status: action,
      reviewed_by: me!.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', requestId)
    load()
  }

  const filteredCategories = categories.filter((c) => c.project_id === editProjectId)

  return (
    <div className="p-4">
      {/* Week nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekOffset((o) => o - 1)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300">&larr;</button>
        <span className="text-sm text-white font-semibold">
          {monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        <button onClick={() => setWeekOffset((o) => Math.min(o + 1, 0))} disabled={weekOffset >= 0} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30">&rarr;</button>
      </div>

      {/* Change requests */}
      {changeRequests.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <h3 className="text-yellow-400 text-sm font-semibold mb-2">
            Pending Change Requests ({changeRequests.length})
          </h3>
          {changeRequests.map((cr) => (
            <div key={cr.id} className="mb-2 p-2 bg-slate-900 rounded-lg">
              <div className="text-xs text-slate-400">
                {(cr.requester as unknown as { full_name: string })?.full_name}
              </div>
              <div className="text-sm text-white my-1">{cr.message}</div>
              <div className="flex gap-2">
                <button onClick={() => handleChangeRequest(cr.id, 'approved')} className="text-xs px-2 py-1 bg-green-600 text-white rounded">Approve</button>
                <button onClick={() => handleChangeRequest(cr.id, 'denied')} className="text-xs px-2 py-1 bg-red-600 text-white rounded">Deny</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Employee list */}
      {employees.map((emp) => {
        const hours = getEmployeeHours(emp.id)
        const allApproved = isAllApproved(emp.id)
        const empEntries = getEmployeeEntries(emp.id)
        const expanded = expandedEmp === emp.id

        return (
          <div key={emp.id} className="mb-2 bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
            <div
              className="flex items-center justify-between p-3 cursor-pointer"
              onClick={() => setExpandedEmp(expanded ? null : emp.id)}
            >
              <div>
                <span className="text-white text-sm font-medium">{emp.full_name}</span>
                <span className="text-xs text-slate-400 ml-2">{hours.toFixed(1)} hrs</span>
                <span className="text-xs text-slate-500 ml-1">({empEntries.length} entries)</span>
              </div>
              <div className="flex items-center gap-2">
                {allApproved ? (
                  <span className="text-xs text-green-400 bg-green-500/20 px-2 py-0.5 rounded">Approved</span>
                ) : empEntries.length > 0 ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); approveAll(emp.id) }}
                    className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-500"
                  >
                    Approve All
                  </button>
                ) : null}
              </div>
            </div>

            {expanded && (
              <div className="border-t border-slate-800 p-2">
                {empEntries.length === 0 ? (
                  <p className="text-xs text-slate-500 p-2">No entries this week</p>
                ) : empEntries.map((entry) => {
                  const isEditing = editingEntry === entry.id
                  const h = entry.clock_out
                    ? ((new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 3600000).toFixed(1)
                    : 'active'

                  return (
                    <div key={entry.id} className="p-2 mb-1 bg-slate-800 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs text-slate-400">
                            {new Date(entry.clock_in).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-xs text-slate-500 ml-2">{h}h</span>
                          <div className="text-xs text-white mt-0.5">
                            {formatActivityType(entry.activity_type)}
                            {entry.project && ` - ${(entry.project as unknown as { project_num: string }).project_num}`}
                            {entry.category && ` > ${(entry.category as unknown as { description: string }).description}`}
                            {entry.worker_class && ` [${(entry.worker_class as unknown as { name: string }).name}]`}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {!isEditing && (
                            <>
                              <button onClick={() => startEdit(entry)} className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded">Edit</button>
                              {entry.status !== 'approved' && (
                                <button onClick={() => approveEntry(entry.id)} className="text-xs px-2 py-1 bg-green-600 text-white rounded">✓</button>
                              )}
                              {entry.status !== 'flagged' && (
                                <button onClick={() => flagEntry(entry.id)} className="text-xs px-2 py-1 bg-red-600 text-white rounded">⚑</button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {isEditing && (
                        <div className="mt-2 space-y-2 border-t border-slate-700 pt-2">
                          <select value={editProjectId} onChange={(e) => { setEditProjectId(e.target.value); setEditCategoryId('') }}
                            className="w-full px-2 py-1.5 rounded bg-slate-900 text-white text-xs border border-slate-700">
                            <option value="">No job</option>
                            {projects.map((p) => <option key={p.id} value={p.id}>{p.project_num} - {p.name}</option>)}
                          </select>
                          {editProjectId && (
                            <select value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)}
                              className="w-full px-2 py-1.5 rounded bg-slate-900 text-white text-xs border border-slate-700">
                              <option value="">Select category...</option>
                              {filteredCategories.map((c) => <option key={c.id} value={c.id}>{c.description}</option>)}
                            </select>
                          )}
                          <select value={editClassId} onChange={(e) => setEditClassId(e.target.value)}
                            className="w-full px-2 py-1.5 rounded bg-slate-900 text-white text-xs border border-slate-700">
                            <option value="">Select class...</option>
                            {workerClasses.map((wc) => <option key={wc.id} value={wc.id}>{wc.name}</option>)}
                          </select>
                          <div className="flex gap-2">
                            <button onClick={() => setEditingEntry(null)} className="text-xs px-3 py-1 bg-slate-700 text-slate-300 rounded">Cancel</button>
                            <button onClick={() => saveEdit(entry.id)} className="text-xs px-3 py-1 bg-blue-600 text-white rounded">Save</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function formatActivityType(type: string): string {
  const map: Record<string, string> = {
    job: 'JOB', shop_mechanic: 'MECHANIC', shop_office: 'OFFICE',
    trucking: 'TRUCKING', plowing: 'PLOWING', break: 'BREAK',
  }
  return map[type] ?? type
}
