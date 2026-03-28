import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { TimeEntry } from '../lib/types'
import { useWeekDates, isCurrentWeek } from '../hooks/useWeekDates'
import { useVoice } from '../hooks/useVoice'

export default function TimesheetScreen() {
  const { employee } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const { monday, sunday, days, isCurrent } = useWeekDates(weekOffset)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [showSickForm, setShowSickForm] = useState(false)
  const [showChangeReq, setShowChangeReq] = useState<string | null>(null)
  const [changeMsg, setChangeMsg] = useState('')
  const voice = useVoice((text) => setChangeMsg((prev) => prev + ' ' + text))

  const loadEntries = useCallback(async () => {
    if (!employee) return
    const { data } = await supabase
      .from('time_entries')
      .select(`
        *,
        project:projects(project_num, name),
        category:categories(description, cat_code, phases!inner(phase_code, name)),
        equipment:equipment(name, description),
        trucking_option:trucking_options(name),
        plow_location:plow_locations(name),
        worker_class:worker_classes(name)
      `)
      .eq('employee_id', employee.id)
      .gte('clock_in', monday.toISOString())
      .lte('clock_in', sunday.toISOString())
      .order('clock_in', { ascending: true })
    setEntries(data ?? [])
  }, [employee, monday, sunday])

  useEffect(() => { loadEntries() }, [loadEntries])

  function hoursForDay(date: Date): number {
    return entries
      .filter((e) => {
        const d = new Date(e.clock_in)
        return d.toDateString() === date.toDateString() && e.clock_out && e.activity_type !== 'break'
      })
      .reduce((sum, e) => {
        const ms = new Date(e.clock_out!).getTime() - new Date(e.clock_in).getTime()
        return sum + ms / 3600000
      }, 0)
  }

  const totalHours = days.reduce((sum, d) => sum + hoursForDay(d), 0)

  async function submitSickDay(dateStr: string) {
    if (!employee) return
    const date = new Date(dateStr)
    if (!isCurrentWeek(date)) return alert('Sick days can only be entered for the current week')

    // Check existing sick hours for this day
    const existing = entries.filter(
      (e) => e.pay_type === 'sick' && new Date(e.clock_in).toDateString() === date.toDateString(),
    )
    if (existing.length > 0) return alert('Sick day already entered for this date')

    const start = new Date(date)
    start.setHours(8, 0, 0, 0)
    const end = new Date(date)
    end.setHours(16, 0, 0, 0)

    await supabase.from('time_entries').insert({
      employee_id: employee.id,
      activity_type: 'shop_office',
      clock_in: start.toISOString(),
      clock_out: end.toISOString(),
      worker_class_id: null,
      pay_type: 'sick',
      hours: 8,
    })
    setShowSickForm(false)
    loadEntries()
  }

  async function submitChangeRequest(entryId: string) {
    if (!employee || !changeMsg.trim()) return
    await supabase.from('time_change_requests').insert({
      time_entry_id: entryId,
      requested_by: employee.id,
      message: changeMsg.trim(),
    })
    setShowChangeReq(null)
    setChangeMsg('')
    alert('Change request submitted')
  }

  return (
    <div className="p-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300"
        >
          &larr;
        </button>
        <div className="text-center">
          <div className="text-sm text-white font-semibold">
            {monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
            {sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
          <div className="text-xs text-slate-400">
            {totalHours.toFixed(1)} total hours
            {totalHours > 40 && (
              <span className="text-orange-500 ml-1">({(totalHours - 40).toFixed(1)} OT)</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setWeekOffset((o) => Math.min(o + 1, 0))}
          disabled={weekOffset >= 0}
          className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-30"
        >
          &rarr;
        </button>
      </div>

      {/* Sick day button */}
      {isCurrent && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowSickForm(!showSickForm)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            + Sick Day
          </button>
        </div>
      )}

      {showSickForm && (
        <div className="mb-4 p-3 bg-slate-900 rounded-lg border border-slate-700">
          <label className="block text-xs text-slate-400 mb-1">Date for sick day</label>
          <input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => submitSickDay(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
          />
        </div>
      )}

      {/* Day breakdown */}
      {days.map((day) => {
        const dayEntries = entries.filter(
          (e) => new Date(e.clock_in).toDateString() === day.toDateString(),
        )
        const dayHours = hoursForDay(day)
        const isToday = day.toDateString() === new Date().toDateString()

        return (
          <div key={day.toISOString()} className="mb-3">
            <div className="flex justify-between items-center mb-1">
              <span className={`text-sm font-semibold ${isToday ? 'text-blue-400' : 'text-slate-300'}`}>
                {day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
              <span className="text-xs text-slate-400">{dayHours.toFixed(1)} hrs</span>
            </div>
            {dayEntries.length === 0 ? (
              <div className="text-xs text-slate-600 pl-2">No entries</div>
            ) : (
              dayEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="ml-2 mb-1 p-2 bg-slate-900 rounded-lg border border-slate-800 flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        entry.activity_type === 'break'
                          ? 'bg-orange-500/20 text-orange-400'
                          : entry.pay_type === 'sick'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {entry.pay_type === 'sick' ? 'SICK' : formatActivityType(entry.activity_type)}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        entry.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                        entry.status === 'flagged' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {entry.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {formatTime(entry.clock_in)} - {entry.clock_out ? formatTime(entry.clock_out) : 'active'}
                      {entry.clock_out && ` (${((new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 3600000).toFixed(1)}h)`}
                    </div>
                    {getEntryDetail(entry) && (
                      <div className="text-xs text-slate-500 mt-0.5">{getEntryDetail(entry)}</div>
                    )}
                  </div>
                  {isCurrent && entry.activity_type !== 'break' && (
                    <button
                      onClick={() => { setShowChangeReq(entry.id); setChangeMsg('') }}
                      className="text-xs text-slate-500 hover:text-blue-400 px-2"
                    >
                      Edit
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )
      })}

      {/* Change request modal */}
      {showChangeReq && (
        <div className="fixed inset-0 bg-black/70 flex items-end justify-center z-50">
          <div className="bg-slate-900 w-full max-w-lg rounded-t-2xl p-4">
            <h3 className="text-white font-semibold mb-2">Request Time Change</h3>
            <p className="text-xs text-slate-400 mb-3">Describe what needs to be changed</p>
            <div className="flex gap-2 mb-3">
              <textarea
                value={changeMsg}
                onChange={(e) => setChangeMsg(e.target.value)}
                placeholder="e.g. I clocked in late, actual start was 7:00 AM"
                rows={3}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm resize-none focus:outline-none focus:border-blue-500"
              />
              {voice.supported && (
                <button
                  onClick={voice.toggle}
                  className={`px-3 rounded-lg transition ${
                    voice.listening ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  🎤
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowChangeReq(null)}
                className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => submitChangeRequest(showChangeReq)}
                disabled={!changeMsg.trim()}
                className="flex-1 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatActivityType(type: string): string {
  const map: Record<string, string> = {
    job: 'JOB',
    shop_mechanic: 'MECHANIC',
    shop_office: 'OFFICE',
    trucking: 'TRUCKING',
    plowing: 'PLOWING',
    break: 'BREAK',
  }
  return map[type] ?? type
}

function getEntryDetail(entry: TimeEntry): string {
  const parts: string[] = []
  const p = entry.project as unknown as { project_num: string; name: string } | null
  const c = entry.category as unknown as { description: string } | null
  const eq = entry.equipment as unknown as { name: string } | null
  const tr = entry.trucking_option as unknown as { name: string } | null
  const pl = entry.plow_location as unknown as { name: string } | null
  const wc = entry.worker_class as unknown as { name: string } | null

  if (p) parts.push(`${p.project_num} - ${p.name}`)
  if (c) parts.push(c.description)
  if (eq) parts.push(eq.name)
  if (tr) parts.push(tr.name)
  if (pl) parts.push(pl.name)
  if (wc) parts.push(`[${wc.name}]`)
  return parts.join(' > ')
}
