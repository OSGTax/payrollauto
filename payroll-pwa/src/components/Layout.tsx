import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const workerTabs = [
  { to: '/', label: 'Clock', icon: '⏱' },
  { to: '/timesheet', label: 'Timesheet', icon: '📋' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

const managerTabs = [
  { to: '/', label: 'Clock', icon: '⏱' },
  { to: '/timesheet', label: 'Timesheet', icon: '📋' },
  { to: '/approve', label: 'Approve', icon: '✓' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

const adminTabs = [
  { to: '/', label: 'Clock', icon: '⏱' },
  { to: '/timesheet', label: 'Timesheet', icon: '📋' },
  { to: '/approve', label: 'Approve', icon: '✓' },
  { to: '/admin', label: 'Admin', icon: '🔧' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Layout() {
  const { employee, signOut } = useAuth()
  const role = employee?.role ?? 'worker'
  const tabs = role === 'admin' ? adminTabs : role === 'manager' ? managerTabs : workerTabs

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <img src="/favicon.svg" alt="AJK" className="w-8 h-8 rounded" />
          <span className="font-bold text-sm text-blue-400">CrewClock</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">{employee?.full_name}</span>
          <button
            onClick={signOut}
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom Nav */}
      <nav className="flex items-center justify-around bg-slate-900 border-t border-slate-800 pb-safe">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center py-2 px-3 text-xs transition ${
                isActive ? 'text-blue-400' : 'text-slate-500'
              }`
            }
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
