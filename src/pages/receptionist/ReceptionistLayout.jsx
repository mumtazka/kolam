import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../../components/ui/button';
import Header from '../../components/layout/Header';
import {
    Printer,
    History,
    BarChart3,
    CalendarDays,
    ScanLine
} from 'lucide-react';

import PoolLogo from '../../components/ui/PoolLogo';
// Custom Icons
import PoolManagementIcon from '../../components/ui/icons/PoolManagementIcon';

const ReceptionistLayout = () => {
    const { user, logout } = useAuth();
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Define menu items for Receptionist
    const menuItems = [
        { path: '/receptionist', label: 'Cetak Tiket', icon: Printer, subtitle: 'Pilih kategori tiket untuk dicetak' },
        { path: '/receptionist/schedule', label: 'Jadwal & Sesi', icon: CalendarDays, subtitle: 'Lihat jadwal dan sesi kolam renang' },
        { path: '/receptionist/pools', label: 'Info Kolam', icon: PoolManagementIcon, subtitle: 'Informasi fasilitas kolam renang' },
        { path: '/receptionist/history', label: 'Laporan', icon: BarChart3, subtitle: 'Laporan harian penjualan tiket anda' },
        { path: '/scanner', label: 'Scanner', icon: ScanLine, subtitle: 'Pindah ke mode Scanner' },
    ];

    // Determine Page Title and Subtitle
    const activeItem = menuItems.find(item =>
        item.path === '/receptionist'
            ? location.pathname === '/receptionist'
            : location.pathname.startsWith(item.path)
    ) || menuItems[0];

    const pageTitle = activeItem ? activeItem.label : 'Kolam Renang UNY';
    const pageSubtitle = activeItem ? activeItem.subtitle : '';

    return (
        <div className="flex h-screen bg-slate-50" data-testid="receptionist-layout">
            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="flex flex-col h-full">
                    {/* Brand */}
                    <div className="p-6 border-b border-slate-800">
                        <div className="flex items-center gap-4">
                            <PoolLogo className="w-12 h-12 rounded-xl shadow-lg shadow-teal-900/50" />
                            <div>
                                <h1 className="text-lg font-bold leading-tight" style={{ fontFamily: 'Outfit' }}>Kolam Renang UNY</h1>
                                <p className="text-xs text-slate-400 mt-1 font-medium">Resepsionis</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2 sidebar-nav overflow-y-auto sidebar-scrollbar">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            // Check if exact match for root path, or starts with for sub-paths
                            const isActive = item.path === '/receptionist'
                                ? location.pathname === '/receptionist'
                                : location.pathname.startsWith(item.path);

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg ${isActive ? 'bg-teal-500 text-white' : 'text-slate-300 hover:bg-slate-800'
                                        }`}
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
            <div className="flex-1 flex flex-col overflow-hidden h-screen">
                {/* Header */}
                <Header
                    title={pageTitle}
                    subtitle={pageSubtitle}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                />

                {/* Content Area - Scrollable */}
                <main className={`flex-1 bg-slate-50 ${location.pathname === '/receptionist' ? 'overflow-hidden p-0' : 'overflow-auto p-6'}`}>
                    {/* Outlet renders the child routes */}
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default ReceptionistLayout;
