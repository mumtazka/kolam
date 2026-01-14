import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/button';
import { Menu, LogOut, ScanLine, User, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const Header = ({ title, subtitle, sidebarOpen, setSidebarOpen }) => {
    const { user, logout, switchMode } = useAuth();
    const { t, language, changeLanguage } = useLanguage();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleSwitchMode = async (mode, path) => {
        try {
            await switchMode(mode);
            navigate(path);
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <header className="bg-white border-b border-slate-200 min-h-16 px-4 md:px-6 py-3 flex items-center justify-between shrink-0 z-30 shadow-sm relative">
            {/* Left: Mobile Menu & Title */}
            <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden text-slate-500 hover:text-slate-700 shrink-0"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    <Menu className="w-6 h-6" />
                </Button>
                <div className="min-w-0">
                    <h1 className="text-xl md:text-2xl font-bold font-outfit text-slate-800 tracking-tight truncate">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-xs md:text-sm text-slate-500 truncate">{subtitle}</p>
                    )}
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 md:gap-4">
                {/* Language Switcher */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => changeLanguage('id')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${language === 'id'
                            ? 'bg-white text-sky-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        ID
                    </button>
                    <button
                        onClick={() => changeLanguage('en')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${language === 'en'
                            ? 'bg-white text-sky-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        EN
                    </button>
                </div>

                {/* User Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-3 pl-3 md:pl-4 border-l border-slate-200 hover:bg-transparent p-0 h-auto">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-slate-900 leading-tight">{user?.name}</p>
                                <p className="text-xs text-slate-500">{user?.role === 'admin' ? t('admin.panel') : 'Staff'}</p>
                            </div>
                            <div className="w-8 h-8 md:w-9 md:h-9 bg-sky-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-white">
                                {user?.name?.charAt(0).toUpperCase()}
                            </div>
                            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        {user?.type !== 'ADMIN' && user?.active_mode === 'CASHIER' && (
                            <DropdownMenuItem onClick={() => handleSwitchMode('SCANNER', '/scanner')} className="cursor-pointer">
                                <ScanLine className="w-4 h-4 mr-2" />
                                <span>{t('auth.switchMode')}: {t('auth.modeScanner')}</span>
                            </DropdownMenuItem>
                        )}

                        {user?.type !== 'ADMIN' && (
                            <DropdownMenuSeparator />
                        )}

                        <DropdownMenuItem onClick={handleLogout} className="text-rose-600 focus:text-rose-600 cursor-pointer">
                            <LogOut className="w-4 h-4 mr-2" />
                            <span>{t('common.logout')}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
};

export default Header;
