import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/auth-context';
import { ThemeProvider } from '@/context/theme-context';
import { Toaster } from '@/components/ui/sonner';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { AppLayout } from '@/components/layout/app-layout';

// Auth pages
import LoginPage from '@/pages/auth/login';
import SignupPage from '@/pages/auth/signup';

// App pages
import DashboardPage from '@/pages/dashboard';
import VehiclesPage from '@/pages/vehicles';
import DriversPage from '@/pages/drivers';
import TripsPage from '@/pages/trips';
import MaintenancePage from '@/pages/maintenance';
import FuelExpensesPage from '@/pages/fuel-expenses';
import ReportsPage from '@/pages/reports';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected routes — require auth */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/vehicles" element={<VehiclesPage />} />
                <Route path="/drivers" element={<DriversPage />} />
                <Route path="/trips" element={<TripsPage />} />
                <Route path="/maintenance" element={<MaintenancePage />} />
                <Route path="/fuel-expenses" element={<FuelExpensesPage />} />
                <Route path="/reports" element={<ReportsPage />} />
              </Route>
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </ThemeProvider>
  );
}
