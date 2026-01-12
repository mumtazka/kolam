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
import SessionManagement from './pages/admin/SessionManagement';
import PackageManagement from './pages/admin/PackageManagement';
import PoolManagement from './pages/admin/PoolManagement';
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

  // Redirect based on role
  if (user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  } else if (user.role === 'RECEPTIONIST') {
    return <Navigate to="/receptionist" replace />;
  } else if (user.role === 'SCANNER') {
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
                <Route path="sessions" element={<SessionManagement />} />
                <Route path="packages" element={<PackageManagement />} />
                <Route path="reports" element={<Reports />} />
              </Route>

              {/* Receptionist Route */}
              <Route
                path="/receptionist"
                element={
                  <ProtectedRoute allowedRoles={['RECEPTIONIST', 'ADMIN']}>
                    <ReceptionistLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<ReceptionistDashboard />} />
                <Route path="schedule" element={<ReceptionistSchedule />} />
                <Route path="history" element={<ReceptionistHistory />} />
                <Route path="pools" element={<ReceptionistPools />} />
              </Route>

              {/* Scanner Route */}
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