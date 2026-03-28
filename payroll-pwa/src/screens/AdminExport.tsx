import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { CeRow, TimeEntry } from '../lib/types'
import { getWeekBounds } from '../hooks/useWeekDates'

export default function AdminExport() {
  const [startDate, setStartDate] = useState(() => {
    const { monday } = getWeekBounds(new Date())
    return monday.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState(() => {
    const { sunday } = getWeekBounds(new Date())
    return sunday.toISOString().slice(0, 10)
  })
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [ceRows, setCeRows] = useState<CeRow[]>([])
  const [editingRow, setEditingRow] = useState<number | null>(null)

  const loadEntries = useCallback(async () => {
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const { data } = await supabase
      .from('time_entries')
      .select(`
        *,
        employee:employees(emp_id, full_name, default_class),
        project:projects(project_num, name),
        category:categories(cat_code, description, phases!inner(phase_code, name)),
        equipment:equipment(name),
        trucking_option:trucking_options(name),
        plow_location:plow_locations(name),
        worker_class:worker_classes(name)
      `)
      .gte('clock_in', start.toISOString())
      .lte('clock_in', end.toISOString())
      .not('clock_out', 'is', null)
      .neq('activity_type', 'break')
      .order('clock_in')

    setEntries(data ?? [])
    if (data) setCeRows(buildCeRows(data))
  }, [startDate, endDate])

  useEffect(() => { loadEntries() }, [loadEntries])

  function updateRow(idx: number, field: keyof CeRow, value: string | number) {
    setCeRows((rows) => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  function downloadFile(format: 'csv' | 'tab') {
    const delim = format === 'tab' ? '\t' : ','
    const headers = CE_HEADERS.join(delim)
    const lines = ceRows.map((r) =>
      CE_HEADERS.map((h) => {
        const val = String(r[h as keyof CeRow] ?? '')
        return val.includes(delim) || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val
      }).join(delim)
    )
    const content = [headers, ...lines].join('\n')
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `CE_Payroll_${startDate}_to_${endDate}.${format === 'tab' ? 'txt' : 'csv'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4">
      <h2 className="text-white font-semibold mb-3">CE Payroll Export</h2>

      {/* Date range */}
      <div className="flex gap-2 mb-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">From</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">To</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm" />
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => downloadFile('csv')} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg font-semibold">
          Download CSV
        </button>
        <button onClick={() => downloadFile('tab')} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg font-semibold">
          Download Tab
        </button>
      </div>

      <div className="text-xs text-slate-400 mb-2">{ceRows.length} rows from {entries.length} entries</div>

      {/* Preview table */}
      <div className="overflow-x-auto">
        <table className="text-xs min-w-full">
          <thead>
            <tr className="text-slate-400">
              {['emp', 'type', 'class', 'job', 'phase', 'cat', 'dept', 'hours', 'date', 'des1', 'wcomp1'].map((h) => (
                <th key={h} className="px-2 py-1 text-left font-medium">{h}</th>
              ))}
              <th className="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody>
            {ceRows.map((row, i) => (
              <tr key={i} className="border-t border-slate-800">
                <td className="px-2 py-1 text-white">{row.emp}</td>
                <td className="px-2 py-1 text-white">{row.type}</td>
                <td className="px-2 py-1 text-white">{row.class}</td>
                <td className="px-2 py-1 text-white">{row.job}</td>
                <td className="px-2 py-1 text-white">{row.phase}</td>
                <td className="px-2 py-1 text-white">{row.cat}</td>
                <td className="px-2 py-1 text-white">{row.department}</td>
                <td className="px-2 py-1 text-white">{typeof row.hours === 'number' ? row.hours.toFixed(2) : row.hours}</td>
                <td className="px-2 py-1 text-white">{row.date}</td>
                <td className="px-2 py-1 text-white max-w-[100px] truncate">{row.des1}</td>
                <td className="px-2 py-1 text-white">{row.wcomp1}</td>
                <td className="px-2 py-1">
                  <button onClick={() => setEditingRow(editingRow === i ? null : i)} className="text-blue-400 hover:text-blue-300">
                    {editingRow === i ? 'Close' : 'Edit'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inline row editor */}
      {editingRow !== null && ceRows[editingRow] && (
        <div className="mt-4 p-3 bg-slate-900 rounded-lg border border-slate-700">
          <h4 className="text-white text-sm font-semibold mb-2">Edit Row {editingRow + 1}</h4>
          <div className="grid grid-cols-2 gap-2">
            {CE_HEADERS.map((h) => (
              <div key={h}>
                <label className="block text-xs text-slate-500">{h}</label>
                <input
                  value={String(ceRows[editingRow][h as keyof CeRow] ?? '')}
                  onChange={(e) => updateRow(editingRow, h as keyof CeRow, e.target.value)}
                  className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-xs"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// CE Headers
const CE_HEADERS = [
  'emp','type','otmult','class','job','phase','cat','department','worktype',
  'unionloc','billat','hours','rate','amount','date','des1','des2',
  'wcomp1','wcomp2','state','local','units','costtype','costcode',
  'equipnum','equipcode','equiporder','equiphours','equipdes','account',
  'starttime','endtime',
] as const

function buildCeRows(entries: TimeEntry[]): CeRow[] {
  // Group by employee for OT calculation
  const byEmp: Record<string, TimeEntry[]> = {}
  for (const e of entries) {
    const emp = e.employee as unknown as { emp_id: string } | null
    const empId = emp?.emp_id ?? ''
    if (!byEmp[empId]) byEmp[empId] = []
    byEmp[empId].push(e)
  }

  const rows: CeRow[] = []
  for (const empId of Object.keys(byEmp).sort()) {
    const empEntries = byEmp[empId].sort((a, b) => new Date(a.clock_in).getTime() - new Date(b.clock_in).getTime())
    let accumulated = 0

    for (const entry of empEntries) {
      if (!entry.clock_out) continue
      const hours = (new Date(entry.clock_out).getTime() - new Date(entry.clock_in).getTime()) / 3600000
      const round = (n: number) => Math.round(n * 100) / 100

      const proj = entry.project as unknown as { project_num: string } | null
      const cat = entry.category as unknown as { cat_code: string; phases: { phase_code: string } } | null
      const eq = entry.equipment as unknown as { name: string } | null
      const wc = entry.worker_class as unknown as { name: string } | null
      const tr = entry.trucking_option as unknown as { name: string } | null
      const pl = entry.plow_location as unknown as { name: string } | null

      let job = '', phase = '', catCode = '', department = '', des1 = ''
      let worktype = 1
      const empClass = wc?.name ?? ''

      switch (entry.activity_type) {
        case 'job':
          job = proj?.project_num ?? ''
          phase = cat?.phases?.phase_code ?? ''
          catCode = cat?.cat_code ?? ''
          department = 'FIELD'
          worktype = 1
          break
        case 'shop_mechanic':
          department = 'SHOP'
          worktype = 2
          des1 = eq?.name ? `Mechanic - ${eq.name}` : 'Mechanic'
          break
        case 'shop_office':
          department = 'ADMIN'
          worktype = 2
          des1 = 'Office'
          break
        case 'trucking':
          department = 'FIELD'
          worktype = 1
          des1 = tr?.name ?? 'Trucking'
          break
        case 'plowing':
          department = 'FIELD'
          worktype = 1
          des1 = pl?.name ?? 'Plowing'
          break
      }

      // Pay type overrides
      let payType = 1 // regular
      if (entry.pay_type === 'sick') payType = 3
      else if (entry.pay_type === 'vacation') payType = 4
      else if (entry.pay_type === 'double_time') payType = 5

      const makeCeRow = (type: number, h: number): CeRow => ({
        emp: empId, type, otmult: type === 2 ? '1.5' : '1.0', class: empClass,
        job, phase, cat: catCode, department, worktype,
        unionloc: '', billat: '', hours: round(h), rate: '', amount: '',
        date: formatDate(entry.clock_in), des1, des2: '',
        wcomp1: '', wcomp2: '', state: '', local: '',
        units: '', costtype: '', costcode: '',
        equipnum: eq?.name ?? '', equipcode: '', equiporder: '', equiphours: '', equipdes: '',
        account: '', starttime: formatTime(entry.clock_in), endtime: formatTime(entry.clock_out!),
      })

      if (entry.pay_type !== 'regular') {
        // Sick/vacation/double_time bypass OT calc
        rows.push(makeCeRow(payType, round(hours)))
      } else {
        const prev = accumulated
        accumulated += hours
        if (prev >= 40) {
          rows.push(makeCeRow(2, round(hours)))
        } else if (accumulated > 40) {
          const reg = round(40 - prev)
          const ot = round(hours - reg)
          if (reg > 0) rows.push(makeCeRow(1, reg))
          if (ot > 0) rows.push(makeCeRow(2, ot))
        } else {
          rows.push(makeCeRow(1, round(hours)))
        }
      }
    }
  }
  return rows
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m} ${ampm}`
}
