import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Layout from './components/Layout'
import LoginScreen from './screens/LoginScreen'
import ClockScreen from './screens/ClockScreen'
import TimesheetScreen from './screens/TimesheetScreen'
import ManagerDashboard from './screens/ManagerDashboard'
import AdminDashboard from './screens/AdminDashboard'
import SettingsScreen from './screens/SettingsScreen'

function AppRoutes() {
  const { session, employee, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  if (!session || !employee) return <LoginScreen />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ClockScreen />} />
        <Route path="/timesheet" element={<TimesheetScreen />} />
        <Route
          path="/approve"
          element={
            employee.role === 'manager' || employee.role === 'admin'
              ? <ManagerDashboard />
              : <Navigate to="/" />
          }
        />
        <Route
          path="/admin"
          element={
            employee.role === 'admin'
              ? <AdminDashboard />
              : <Navigate to="/" />
          }
        />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
