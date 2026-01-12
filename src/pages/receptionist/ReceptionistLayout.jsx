import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../../components/ui/button';
import {
    Printer,
    Calendar,
    History,
    MapPin,
    LogOut,
    Menu,
    X,
    User
} from 'lucide-react';

const ReceptionistLayout = () => {
    const { user, logout } = useAuth();
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Define menu items for Receptionist
    const menuItems = [
        { path: '/receptionist', label: 'Cetak Tiket', icon: Printer },
        { path: '/receptionist/schedule', label: 'Jadwal & Sesi', icon: Calendar },
        { path: '/receptionist/pools', label: 'Info Kolam', icon: MapPin },
        { path: '/receptionist/history', label: 'Riwayat Staff', icon: History },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="flex h-screen bg-slate-50" data-testid="receptionist-layout">
            {/* Sidebar */}
            <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-800">
                        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Outfit' }}>Kolam Renang UNY</h1>
                        <p className="text-sm text-slate-400 mt-1">Resepsionis Panel</p>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-2 sidebar-nav">
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
                                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Info */}
                    <div className="p-4 border-t border-slate-800">
                        <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center font-bold text-white">
                                <User className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium truncate text-white">{user?.name}</p>
                                <p className="text-xs text-slate-400 truncate">{user?.role}</p>
                            </div>
                        </div>
                        <Button
                            onClick={handleLogout}
                            variant="ghost"
                            className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            {t('common.logout')}
                        </Button>
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
                {/* Mobile Header */}
                <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between z-30">
                    <h1 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Kolam Renang UNY</h1>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </Button>
                </header>

                {/* Content Area - Scrollable */}
                <main className="flex-1 overflow-auto bg-slate-50">
                    {/* Outlet renders the child routes */}
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default ReceptionistLayout;
