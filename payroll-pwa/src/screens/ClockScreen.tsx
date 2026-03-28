import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { ActivityType, TimeEntry, Project, Category, Equipment, TruckingOption, PlowLocation, WorkerClass } from '../lib/types'
import { useTimer } from '../hooks/useTimer'
import { useGps } from '../hooks/useGps'
import ActivityDashboard from './ActivityDashboard'

export default function ClockScreen() {
  const { employee } = useAuth()
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [preBreakEntry, setPreBreakEntry] = useState<TimeEntry | null>(null)
  const [showDashboard, setShowDashboard] = useState(false)
  const [switchMode, setSwitchMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const elapsed = useTimer(activeEntry?.clock_in ?? null)
  const { capture } = useGps()

  // Reference data
  const [projects, setProjects] = useState<Project[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [truckingOptions, setTruckingOptions] = useState<TruckingOption[]>([])
  const [plowLocations, setPlowLocations] = useState<PlowLocation[]>([])
  const [workerClasses, setWorkerClasses] = useState<WorkerClass[]>([])
  const [plowingEnabled, setPlowingEnabled] = useState(false)

  // Load active entry
  const loadActive = useCallback(async () => {
    if (!employee) return
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', employee.id)
      .is('clock_out', null)
      .order('clock_in', { ascending: false })
      .limit(1)
      .single()
    setActiveEntry(data)
    setLoading(false)
  }, [employee])

  // Load reference data
  useEffect(() => {
    async function load() {
      const [p, c, e, t, pl, wc, settings] = await Promise.all([
        supabase.from('projects').select('*').eq('is_active', true).order('project_num'),
        supabase.from('categories').select('*, phases!inner(id, phase_code, project_id, name)').eq('is_active', true).order('description'),
        supabase.from('equipment').select('*').eq('is_active', true).order('name'),
        supabase.from('trucking_options').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('plow_locations').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('worker_classes').select('*').eq('is_active', true).order('name'),
        supabase.from('app_settings').select('*').eq('key', 'plowing_enabled').single(),
      ])
      setProjects(p.data ?? [])
      setCategories((c.data ?? []).map((cat: Record<string, unknown>) => {
        const phases = cat.phases as { id: string; phase_code: string; project_id: string; name: string }
        return {
          ...cat,
          phase_code: phases.phase_code,
          phase_id: phases.id,
          project_id: phases.project_id,
        }
      }) as Category[])
      setEquipment(e.data ?? [])
      setTruckingOptions(t.data ?? [])
      setPlowLocations(pl.data ?? [])
      setWorkerClasses(wc.data ?? [])
      setPlowingEnabled(settings.data?.value === 'true')
    }
    load()
    loadActive()
  }, [loadActive])

  async function handleClockIn(
    activityType: ActivityType,
    details: {
      project_id?: string
      category_id?: string
      equipment_id?: string
      trucking_option_id?: string
      plow_location_id?: string
      worker_class_id?: string
    },
  ) {
    if (!employee) return

    // If switching, clock out current first
    if (activeEntry && !activeEntry.clock_out) {
      const gps = await capture()
      await supabase
        .from('time_entries')
        .update({
          clock_out: new Date().toISOString(),
          clock_out_lat: gps?.lat ?? null,
          clock_out_lng: gps?.lng ?? null,
        })
        .eq('id', activeEntry.id)
    }

    const gps = await capture()
    const { data } = await supabase
      .from('time_entries')
      .insert({
        employee_id: employee.id,
        activity_type: activityType,
        clock_in: new Date().toISOString(),
        project_id: details.project_id ?? null,
        category_id: details.category_id ?? null,
        equipment_id: details.equipment_id ?? null,
        trucking_option_id: details.trucking_option_id ?? null,
        plow_location_id: details.plow_location_id ?? null,
        worker_class_id: details.worker_class_id ?? null,
        pay_type: 'regular',
        clock_in_lat: gps?.lat ?? null,
        clock_in_lng: gps?.lng ?? null,
      })
      .select()
      .single()

    setActiveEntry(data)
    setShowDashboard(false)
    setSwitchMode(false)
  }

  async function handleClockOut() {
    if (!activeEntry) return
    const gps = await capture()
    await supabase
      .from('time_entries')
      .update({
        clock_out: new Date().toISOString(),
        clock_out_lat: gps?.lat ?? null,
        clock_out_lng: gps?.lng ?? null,
      })
      .eq('id', activeEntry.id)
    setActiveEntry(null)
    setPreBreakEntry(null)
  }

  async function handleBreak() {
    if (!activeEntry) return
    // Save the current entry details before break
    setPreBreakEntry({ ...activeEntry })
    // Clock out current entry
    const gps = await capture()
    await supabase
      .from('time_entries')
      .update({
        clock_out: new Date().toISOString(),
        clock_out_lat: gps?.lat ?? null,
        clock_out_lng: gps?.lng ?? null,
      })
      .eq('id', activeEntry.id)

    // Start break entry
    const gpsIn = await capture()
    const { data } = await supabase
      .from('time_entries')
      .insert({
        employee_id: employee!.id,
        activity_type: 'break' as ActivityType,
        clock_in: new Date().toISOString(),
        worker_class_id: activeEntry.worker_class_id,
        pay_type: 'regular',
        clock_in_lat: gpsIn?.lat ?? null,
        clock_in_lng: gpsIn?.lng ?? null,
      })
      .select()
      .single()
    setActiveEntry(data)
  }

  async function handleEndBreak() {
    if (!activeEntry || !preBreakEntry) return
    // Clock out break
    const gps = await capture()
    await supabase
      .from('time_entries')
      .update({
        clock_out: new Date().toISOString(),
        clock_out_lat: gps?.lat ?? null,
        clock_out_lng: gps?.lng ?? null,
      })
      .eq('id', activeEntry.id)

    // Resume previous activity
    const gpsIn = await capture()
    const { data } = await supabase
      .from('time_entries')
      .insert({
        employee_id: employee!.id,
        activity_type: preBreakEntry.activity_type,
        clock_in: new Date().toISOString(),
        project_id: preBreakEntry.project_id,
        category_id: preBreakEntry.category_id,
        equipment_id: preBreakEntry.equipment_id,
        trucking_option_id: preBreakEntry.trucking_option_id,
        plow_location_id: preBreakEntry.plow_location_id,
        worker_class_id: preBreakEntry.worker_class_id,
        pay_type: 'regular',
        clock_in_lat: gpsIn?.lat ?? null,
        clock_in_lng: gpsIn?.lng ?? null,
      })
      .select()
      .single()
    setActiveEntry(data)
    setPreBreakEntry(null)
  }

  function handleSwitch() {
    setSwitchMode(true)
    setShowDashboard(true)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400">Loading...</div>
  }

  // Activity Dashboard overlay
  if (showDashboard) {
    return (
      <ActivityDashboard
        projects={projects}
        categories={categories}
        equipment={equipment}
        truckingOptions={truckingOptions}
        plowLocations={plowLocations}
        workerClasses={workerClasses}
        plowingEnabled={plowingEnabled}
        defaultClassId={workerClasses.find((w) => w.name === employee?.default_class)?.id}
        currentEntry={switchMode ? activeEntry : null}
        onSubmit={handleClockIn}
        onCancel={() => { setShowDashboard(false); setSwitchMode(false) }}
      />
    )
  }

  // No active entry -- show big Clock In button
  if (!activeEntry) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6">
        <p className="text-slate-400 text-sm mb-2">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
        <button
          onClick={() => setShowDashboard(true)}
          className="w-48 h-48 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center"
        >
          <span className="text-white text-2xl font-bold">CLOCK IN</span>
        </button>
        <p className="text-slate-500 text-xs mt-4">Tap to start your day</p>
      </div>
    )
  }

  // On break
  if (activeEntry.activity_type === 'break') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6">
        <div className="text-orange-500 text-sm font-semibold mb-2">ON BREAK</div>
        <div className="text-4xl font-mono text-white mb-8">{elapsed}</div>
        <button
          onClick={handleEndBreak}
          className="w-48 h-48 rounded-full bg-orange-500 hover:bg-orange-400 active:scale-95 transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center"
        >
          <span className="text-white text-xl font-bold">END BREAK</span>
        </button>
      </div>
    )
  }

  // Active entry -- show timer and controls
  const activityLabel = getActivityLabel(activeEntry)

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <div className="text-green-500 text-sm font-semibold mb-1">CLOCKED IN</div>
      <div className="text-xs text-slate-400 mb-1 px-3 py-1 bg-slate-800 rounded-full">
        {activityLabel}
      </div>
      <div className="text-5xl font-mono text-white my-6">{elapsed}</div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={handleSwitch}
          className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition active:scale-95"
        >
          SWITCH
        </button>
        <button
          onClick={handleBreak}
          className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-semibold transition active:scale-95"
        >
          BREAK
        </button>
      </div>

      <button
        onClick={handleClockOut}
        className="w-40 h-40 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 transition-all shadow-lg shadow-red-600/30 flex items-center justify-center"
      >
        <span className="text-white text-xl font-bold">CLOCK OUT</span>
      </button>
    </div>
  )
}

function getActivityLabel(entry: TimeEntry): string {
  switch (entry.activity_type) {
    case 'job': return 'JOB'
    case 'shop_mechanic': return 'SHOP - Mechanic'
    case 'shop_office': return 'SHOP - Office'
    case 'trucking': return 'TRUCKING'
    case 'plowing': return 'PLOWING'
    case 'break': return 'BREAK'
    default: return entry.activity_type
  }
}
