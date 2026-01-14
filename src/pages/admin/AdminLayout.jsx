import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../../components/ui/button';
import Header from '../../components/layout/Header';
import {
  LayoutDashboard,
  Users,
  Ticket,
  Clock,
  Package,
  MapPin,
  BarChart3,
  Layers
} from 'lucide-react';

const AdminLayout = () => {
  const { t } = useLanguage();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/users', label: t('admin.staffManagement'), icon: Users },
    { path: '/admin/categories', label: t('admin.categories'), icon: Ticket },
    { path: '/admin/sessions', label: 'Jadwal & Sesi', icon: Clock },
    { path: '/admin/ticket-packages', label: 'Tiket Khusus', icon: Layers },
    { path: '/admin/pools', label: t('admin.pools'), icon: MapPin },
    { path: '/admin/shifts', label: t('shift.management'), icon: Clock },
    { path: '/admin/reports', label: t('admin.reports'), icon: BarChart3 },
  ];

  // Determine Page Title
  const activeItem = menuItems.find(item => item.path === location.pathname)
    || menuItems.find(item => location.pathname.startsWith(item.path) && item.path !== '/admin')
    || menuItems[0];

  const pageTitle = activeItem ? activeItem.label : 'Kolam Renang UNY';

  return (
    <div className="flex h-screen bg-slate-50" data-testid="admin-dashboard">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>Kolam Renang UNY</h1>
            <p className="text-sm text-slate-400 mt-1">{t('admin.panel')}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 sidebar-nav overflow-y-auto sidebar-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/admin');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-sky-500 text-white' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Copyright */}
          <div className="p-4 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-500 font-medium">PKLUNY STEWA 2025/2026</p>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          title={pageTitle}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;