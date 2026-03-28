import { useState } from 'react'
import AdminEmployees from './AdminEmployees'
import AdminData from './AdminData'
import AdminExport from './AdminExport'
import AdminSettings from './AdminSettings'

type Tab = 'employees' | 'data' | 'export' | 'settings'

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('employees')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'employees', label: 'Employees' },
    { key: 'data', label: 'Data' },
    { key: 'export', label: 'Export' },
    { key: 'settings', label: 'Settings' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex bg-slate-900 border-b border-slate-800 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-semibold whitespace-nowrap px-3 transition ${
              tab === t.key ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'employees' && <AdminEmployees />}
        {tab === 'data' && <AdminData />}
        {tab === 'export' && <AdminExport />}
        {tab === 'settings' && <AdminSettings />}
      </div>
    </div>
  )
}
