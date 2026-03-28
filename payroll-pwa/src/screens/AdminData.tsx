import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Project, Phase, Category, Equipment, TruckingOption, PlowLocation, WorkerClass } from '../lib/types'

type DataTab = 'projects' | 'equipment' | 'trucking' | 'plowing' | 'classes'

export default function AdminData() {
  const [tab, setTab] = useState<DataTab>('projects')
  const [projects, setProjects] = useState<Project[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [truckingOptions, setTruckingOptions] = useState<TruckingOption[]>([])
  const [plowLocations, setPlowLocations] = useState<PlowLocation[]>([])
  const [workerClasses, setWorkerClasses] = useState<WorkerClass[]>([])

  // Add forms
  const [showAdd, setShowAdd] = useState(false)
  const [addFields, setAddFields] = useState<Record<string, string>>({})
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedPhase, setSelectedPhase] = useState('')
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const [p, ph, c, e, t, pl, wc] = await Promise.all([
      supabase.from('projects').select('*').order('project_num'),
      supabase.from('phases').select('*').order('phase_code'),
      supabase.from('categories').select('*, phases!inner(phase_code, project_id, name)').order('description'),
      supabase.from('equipment').select('*').order('name'),
      supabase.from('trucking_options').select('*').order('sort_order'),
      supabase.from('plow_locations').select('*').order('sort_order'),
      supabase.from('worker_classes').select('*').order('name'),
    ])
    setProjects(p.data ?? [])
    setPhases(ph.data ?? [])
    setCategories(c.data ?? [])
    setEquipment(e.data ?? [])
    setTruckingOptions(t.data ?? [])
    setPlowLocations(pl.data ?? [])
    setWorkerClasses(wc.data ?? [])
  }, [])

  useEffect(() => { load() }, [load])

  function openAdd() {
    setAddFields({})
    setMsg('')
    setShowAdd(true)
  }

  async function handleAdd() {
    setMsg('')
    try {
      switch (tab) {
        case 'projects': {
          // Could be adding a project, phase, or category
          if (addFields.type === 'project') {
            const { error } = await supabase.from('projects').insert({
              project_num: addFields.project_num, name: addFields.name,
            })
            if (error) throw error
          } else if (addFields.type === 'phase') {
            const { error } = await supabase.from('phases').insert({
              project_id: selectedProject, phase_code: addFields.phase_code, name: addFields.name,
            })
            if (error) throw error
          } else if (addFields.type === 'category') {
            const { error } = await supabase.from('categories').insert({
              phase_id: selectedPhase, cat_code: addFields.cat_code, description: addFields.description,
            })
            if (error) throw error
          }
          break
        }
        case 'equipment': {
          const { error } = await supabase.from('equipment').insert({
            name: addFields.name, description: addFields.description || '',
          })
          if (error) throw error
          break
        }
        case 'trucking': {
          const { error } = await supabase.from('trucking_options').insert({
            name: addFields.name, sort_order: parseInt(addFields.sort_order || '0'),
          })
          if (error) throw error
          break
        }
        case 'plowing': {
          const { error } = await supabase.from('plow_locations').insert({
            name: addFields.name, sort_order: parseInt(addFields.sort_order || '0'),
          })
          if (error) throw error
          break
        }
        case 'classes': {
          const { error } = await supabase.from('worker_classes').insert({ name: addFields.name })
          if (error) throw error
          break
        }
      }
      setShowAdd(false)
      load()
    } catch (e) {
      setMsg((e as Error).message)
    }
  }

  const tabs: { key: DataTab; label: string }[] = [
    { key: 'projects', label: 'Jobs' },
    { key: 'equipment', label: 'Equipment' },
    { key: 'trucking', label: 'Trucking' },
    { key: 'plowing', label: 'Plowing' },
    { key: 'classes', label: 'Classes' },
  ]

  return (
    <div className="p-4">
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${tab === t.key ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <button onClick={openAdd} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg mb-4">+ Add New</button>

      {/* Projects/Phases/Categories */}
      {tab === 'projects' && (
        <div>
          {projects.map((proj) => {
            const projPhases = phases.filter((ph) => ph.project_id === proj.id)
            return (
              <div key={proj.id} className="mb-3 bg-slate-900 rounded-lg border border-slate-800 p-3">
                <div className="flex justify-between items-center">
                  <span className="text-white text-sm font-medium">{proj.project_num} - {proj.name}</span>
                  <span className={`text-xs ${proj.is_active ? 'text-green-400' : 'text-red-400'}`}>
                    {proj.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {projPhases.map((ph) => {
                  const phCats = categories.filter((c) => c.phase_id === ph.id)
                  return (
                    <div key={ph.id} className="ml-3 mt-2">
                      <span className="text-xs text-blue-400 font-medium">Phase {ph.phase_code}: {ph.name}</span>
                      {phCats.map((cat) => (
                        <div key={cat.id} className="ml-3 text-xs text-slate-400">
                          {cat.cat_code} - {cat.description}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Equipment */}
      {tab === 'equipment' && (
        <div className="space-y-2">
          {equipment.map((e) => (
            <div key={e.id} className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
              <span className="text-white text-sm">{e.name} - {e.description}</span>
              <span className={`text-xs ${e.is_active ? 'text-green-400' : 'text-red-400'}`}>{e.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Trucking */}
      {tab === 'trucking' && (
        <div className="space-y-2">
          {truckingOptions.map((t) => (
            <div key={t.id} className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
              <span className="text-white text-sm">{t.name}</span>
              <span className="text-xs text-slate-400">#{t.sort_order}</span>
            </div>
          ))}
          {truckingOptions.length === 0 && <p className="text-xs text-slate-500">No trucking options yet. Add some above.</p>}
        </div>
      )}

      {/* Plowing */}
      {tab === 'plowing' && (
        <div className="space-y-2">
          {plowLocations.map((p) => (
            <div key={p.id} className="p-2 bg-slate-900 rounded-lg border border-slate-800 flex justify-between">
              <span className="text-white text-sm">{p.name}</span>
              <span className="text-xs text-slate-400">#{p.sort_order}</span>
            </div>
          ))}
          {plowLocations.length === 0 && <p className="text-xs text-slate-500">No plow locations yet. Add some above.</p>}
        </div>
      )}

      {/* Classes */}
      {tab === 'classes' && (
        <div className="space-y-2">
          {workerClasses.map((wc) => (
            <div key={wc.id} className="p-2 bg-slate-900 rounded-lg border border-slate-800">
              <span className="text-white text-sm">{wc.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl p-4 w-full max-w-sm border border-slate-700">
            <h3 className="text-white font-semibold mb-3">
              Add {tab === 'projects' ? 'Job/Phase/Category' : tab === 'equipment' ? 'Equipment' : tab === 'trucking' ? 'Trucking Option' : tab === 'plowing' ? 'Plow Location' : 'Worker Class'}
            </h3>

            {tab === 'projects' && (
              <>
                <div className="flex gap-1 mb-3">
                  {(['project', 'phase', 'category'] as const).map((t) => (
                    <button key={t} onClick={() => setAddFields({ type: t })}
                      className={`px-3 py-1 rounded text-xs font-semibold ${addFields.type === t ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      {t === 'project' ? 'Job' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
                {addFields.type === 'project' && (
                  <>
                    <Input label="Job Number (xx-xxx)" value={addFields.project_num ?? ''} onChange={(v) => setAddFields({ ...addFields, project_num: v })} placeholder="24-005" />
                    <Input label="Name" value={addFields.name ?? ''} onChange={(v) => setAddFields({ ...addFields, name: v })} placeholder="New Project" />
                  </>
                )}
                {addFields.type === 'phase' && (
                  <>
                    <label className="block text-xs text-slate-400 mb-1">Job</label>
                    <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm mb-2">
                      <option value="">Select job...</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.project_num} - {p.name}</option>)}
                    </select>
                    <Input label="Phase Code (xx)" value={addFields.phase_code ?? ''} onChange={(v) => setAddFields({ ...addFields, phase_code: v })} placeholder="03" />
                    <Input label="Name" value={addFields.name ?? ''} onChange={(v) => setAddFields({ ...addFields, name: v })} placeholder="Concrete" />
                  </>
                )}
                {addFields.type === 'category' && (
                  <>
                    <label className="block text-xs text-slate-400 mb-1">Job</label>
                    <select value={selectedProject} onChange={(e) => { setSelectedProject(e.target.value); setSelectedPhase('') }}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm mb-2">
                      <option value="">Select job...</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.project_num} - {p.name}</option>)}
                    </select>
                    <label className="block text-xs text-slate-400 mb-1">Phase</label>
                    <select value={selectedPhase} onChange={(e) => setSelectedPhase(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm mb-2">
                      <option value="">Select phase...</option>
                      {phases.filter((ph) => ph.project_id === selectedProject).map((ph) => (
                        <option key={ph.id} value={ph.id}>{ph.phase_code} - {ph.name}</option>
                      ))}
                    </select>
                    <Input label="Category Code (xxxx)" value={addFields.cat_code ?? ''} onChange={(v) => setAddFields({ ...addFields, cat_code: v })} placeholder="1010" />
                    <Input label="Description (what workers see)" value={addFields.description ?? ''} onChange={(v) => setAddFields({ ...addFields, description: v })} placeholder="Concrete Foundations" />
                  </>
                )}
              </>
            )}

            {tab === 'equipment' && (
              <>
                <Input label="Name/Number" value={addFields.name ?? ''} onChange={(v) => setAddFields({ ...addFields, name: v })} placeholder="T-107" />
                <Input label="Description" value={addFields.description ?? ''} onChange={(v) => setAddFields({ ...addFields, description: v })} placeholder="2024 CAT 320 Excavator" />
              </>
            )}

            {(tab === 'trucking' || tab === 'plowing') && (
              <>
                <Input label="Name" value={addFields.name ?? ''} onChange={(v) => setAddFields({ ...addFields, name: v })} placeholder={tab === 'trucking' ? 'Hauling - Gravel' : 'Walmart Plaza'} />
                <Input label="Sort Order" value={addFields.sort_order ?? ''} onChange={(v) => setAddFields({ ...addFields, sort_order: v })} placeholder="1" />
              </>
            )}

            {tab === 'classes' && (
              <Input label="Class Name" value={addFields.name ?? ''} onChange={(v) => setAddFields({ ...addFields, name: v })} placeholder="LAB GEN" />
            )}

            {msg && <p className="text-red-400 text-xs mb-2">{msg}</p>}

            <div className="flex gap-2 mt-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm">Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm mb-2" />
    </>
  )
}
