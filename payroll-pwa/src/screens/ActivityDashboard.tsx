import { useState, useMemo } from 'react'
import type { ActivityType, TimeEntry, Project, Category, Equipment, TruckingOption, PlowLocation, WorkerClass } from '../lib/types'

interface Props {
  projects: Project[]
  categories: Category[]
  equipment: Equipment[]
  truckingOptions: TruckingOption[]
  plowLocations: PlowLocation[]
  workerClasses: WorkerClass[]
  plowingEnabled: boolean
  defaultClassId?: string
  currentEntry: TimeEntry | null // non-null when switching
  onSubmit: (type: ActivityType, details: Record<string, string | undefined>) => void
  onCancel: () => void
}

type Tab = 'job' | 'shop' | 'trucking' | 'plowing'

export default function ActivityDashboard({
  projects, categories, equipment, truckingOptions, plowLocations,
  workerClasses, plowingEnabled, defaultClassId, currentEntry,
  onSubmit, onCancel,
}: Props) {
  const [tab, setTab] = useState<Tab>(() => {
    if (currentEntry) {
      if (currentEntry.activity_type === 'job') return 'job'
      if (currentEntry.activity_type.startsWith('shop')) return 'shop'
      if (currentEntry.activity_type === 'trucking') return 'trucking'
      if (currentEntry.activity_type === 'plowing') return 'plowing'
    }
    return 'job'
  })

  // JOB state
  const [projectId, setProjectId] = useState(currentEntry?.project_id ?? '')
  const [categoryId, setCategoryId] = useState(currentEntry?.category_id ?? '')

  // SHOP state
  const [shopType, setShopType] = useState<'mechanic' | 'office'>(
    currentEntry?.activity_type === 'shop_office' ? 'office' : 'mechanic'
  )
  const [equipmentId, setEquipmentId] = useState(currentEntry?.equipment_id ?? '')

  // TRUCKING state
  const [truckingId, setTruckingId] = useState(currentEntry?.trucking_option_id ?? '')

  // PLOWING state
  const [plowId, setPlowId] = useState(currentEntry?.plow_location_id ?? '')

  // Worker class (shared)
  const [classId, setClassId] = useState(currentEntry?.worker_class_id ?? defaultClassId ?? '')
  const [classConfirmed, setClassConfirmed] = useState(false)

  // Filter categories for selected project
  const filteredCategories = useMemo(() => {
    if (!projectId) return []
    return categories.filter((c) => c.project_id === projectId)
  }, [projectId, categories])

  function handleSubmit() {
    switch (tab) {
      case 'job':
        if (!projectId || !categoryId || !classId) return
        onSubmit('job', { project_id: projectId, category_id: categoryId, worker_class_id: classId })
        break
      case 'shop':
        if (!classId) return
        if (shopType === 'mechanic') {
          if (!equipmentId) return
          onSubmit('shop_mechanic', { equipment_id: equipmentId, worker_class_id: classId })
        } else {
          onSubmit('shop_office', { worker_class_id: classId })
        }
        break
      case 'trucking':
        if (!truckingId || !classId) return
        onSubmit('trucking', { trucking_option_id: truckingId, worker_class_id: classId })
        break
      case 'plowing':
        if (!plowId || !classId) return
        onSubmit('plowing', { plow_location_id: plowId, worker_class_id: classId })
        break
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'job', label: 'JOB' },
    { key: 'shop', label: 'SHOP' },
    { key: 'trucking', label: 'TRUCKING' },
    ...(plowingEnabled ? [{ key: 'plowing' as Tab, label: 'PLOWING' }] : []),
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex bg-slate-900 border-b border-slate-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-sm font-semibold transition ${
              tab === t.key
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* JOB Tab */}
        {tab === 'job' && (
          <>
            <SelectField
              label="Job"
              value={projectId}
              onChange={(v) => { setProjectId(v); setCategoryId('') }}
              options={projects.map((p) => ({ value: p.id, label: `${p.project_num} - ${p.name}` }))}
              placeholder="Select a job..."
            />
            <SelectField
              label="What are you doing?"
              value={categoryId}
              onChange={setCategoryId}
              options={filteredCategories.map((c) => ({ value: c.id, label: c.description }))}
              placeholder={projectId ? 'Select category...' : 'Pick a job first'}
              disabled={!projectId}
            />
          </>
        )}

        {/* SHOP Tab */}
        {tab === 'shop' && (
          <>
            <div className="flex gap-2">
              <button
                onClick={() => setShopType('mechanic')}
                className={`flex-1 py-3 rounded-lg font-semibold text-sm transition ${
                  shopType === 'mechanic'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                Mechanic
              </button>
              <button
                onClick={() => setShopType('office')}
                className={`flex-1 py-3 rounded-lg font-semibold text-sm transition ${
                  shopType === 'office'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                Office
              </button>
            </div>
            {shopType === 'mechanic' && (
              <SelectField
                label="Equipment"
                value={equipmentId}
                onChange={setEquipmentId}
                options={equipment.map((e) => ({ value: e.id, label: `${e.name} - ${e.description}` }))}
                placeholder="Select equipment..."
              />
            )}
            {shopType === 'office' && (
              <div className="text-center py-6 text-slate-400 text-sm">
                Office work - no additional selection needed
              </div>
            )}
          </>
        )}

        {/* TRUCKING Tab */}
        {tab === 'trucking' && (
          <SelectField
            label="Trucking Type"
            value={truckingId}
            onChange={setTruckingId}
            options={truckingOptions.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="Select trucking type..."
          />
        )}

        {/* PLOWING Tab */}
        {tab === 'plowing' && (
          <SelectField
            label="Plow Location"
            value={plowId}
            onChange={setPlowId}
            options={plowLocations.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Select plow location..."
          />
        )}

        {/* Worker Class (all tabs) */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Worker Class</label>
          <div
            className={`rounded-lg border-2 transition ${
              !classConfirmed ? 'border-yellow-500 animate-pulse' : 'border-slate-700'
            }`}
          >
            <select
              value={classId}
              onChange={(e) => { setClassId(e.target.value); setClassConfirmed(true) }}
              onFocus={() => setClassConfirmed(true)}
              className="w-full px-4 py-3 rounded-lg bg-slate-900 text-white appearance-none focus:outline-none"
            >
              <option value="">Select class...</option>
              {workerClasses.map((wc) => (
                <option key={wc.id} value={wc.id}>{wc.name}</option>
              ))}
            </select>
          </div>
          {!classConfirmed && (
            <p className="text-yellow-500 text-xs mt-1">Please confirm your worker class</p>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-lg bg-slate-800 text-slate-300 font-semibold transition hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 py-3 rounded-lg bg-green-600 text-white font-semibold transition hover:bg-green-500 active:scale-95"
        >
          {currentEntry ? 'SWITCH' : 'START'}
        </button>
      </div>
    </div>
  )
}

function SelectField({
  label, value, onChange, options, placeholder, disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  placeholder: string
  disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white appearance-none focus:outline-none focus:border-blue-500 disabled:opacity-50"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
