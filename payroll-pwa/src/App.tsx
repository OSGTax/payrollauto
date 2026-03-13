import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import LoginScreen from './auth/LoginScreen';
import Layout from './components/Layout';
import ClockScreen from './clock/ClockScreen';
import TimesheetScreen from './timesheet/TimesheetScreen';
import AdminDashboard from './admin/AdminDashboard';
import SettingsScreen from './admin/SettingsScreen';

function AppRoutes() {
  const { employee, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-lg">Loading...</div>
      </div>
    );
  }

  if (!employee) {
    return <LoginScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ClockScreen />} />
          <Route path="/timesheet" element={<TimesheetScreen />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
