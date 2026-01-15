import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';
import '@/App.css';

// Pages
import Login from './pages/Login';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import CategoryManagement from './pages/admin/CategoryManagement';
import TicketPackageManagement from './pages/admin/TicketPackageManagement';
import SessionManagement from './pages/admin/SessionManagement';
import PoolManagement from './pages/admin/PoolManagement';
import ShiftManagement from './pages/admin/ShiftManagement';
import Reports from './pages/admin/Reports';
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import ReceptionistLayout from './pages/receptionist/ReceptionistLayout';
import ReceptionistPools from './pages/receptionist/ReceptionistPools';
import ReceptionistSchedule from './pages/receptionist/ReceptionistSchedule';
import ReceptionistHistory from './pages/receptionist/ReceptionistHistory';
import ScannerDashboard from './pages/scanner/ScannerDashboard';

const RoleBasedRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on active_mode
  if (user.active_mode === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  } else if (user.active_mode === 'CASHIER') {
    return <Navigate to="/receptionist" replace />;
  } else if (user.active_mode === 'SCANNER') {
    return <Navigate to="/scanner" replace />;
  }

  return <Navigate to="/login" replace />;
};

import { LanguageProvider } from './contexts/LanguageContext';

// ... (other imports)

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* Root - Redirect based on role */}
              <Route path="/" element={<RoleBasedRedirect />} />

              {/* Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="pools" element={<PoolManagement />} />
                <Route path="categories" element={<CategoryManagement />} />
                <Route path="ticket-packages" element={<TicketPackageManagement />} />
                <Route path="sessions" element={<SessionManagement />} />

                <Route path="shifts" element={<ShiftManagement />} />
                <Route path="reports" element={<Reports />} />

                {/* Embedded Tools */}
                <Route path="pos" element={<ReceptionistDashboard />} />
                <Route path="scan" element={<ScannerDashboard />} />
              </Route>

              {/* Receptionist Route - Requires CASHIER mode or ADMIN */}
              <Route
                path="/receptionist"
                element={
                  <ProtectedRoute allowedRoles={['CASHIER', 'ADMIN']}>
                    <ReceptionistLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<ReceptionistDashboard />} />
                <Route path="schedule" element={<ReceptionistSchedule />} />
                <Route path="history" element={<ReceptionistHistory />} />
                <Route path="pools" element={<ReceptionistPools />} />
              </Route>

              {/* Scanner Route - Requires SCANNER mode or ADMIN */}
              <Route
                path="/scanner"
                element={
                  <ProtectedRoute allowedRoles={['SCANNER', 'ADMIN']}>
                    <ScannerDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <Toaster position="top-right" richColors />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;