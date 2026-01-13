import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Sun, Moon, Edit, RefreshCw, Save, Users, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import {
    getActiveShift,
    setActiveShift,
    getStaffSchedules,
    getUserSchedule,
    updateUserFullSchedule
} from '../../services/shiftService';

const ROLES = ['OFF', 'RECEPTIONIST', 'SCANNER', 'ADMIN'];
const DAYS = [
    { key: 'Monday', label: 'Senin' },
    { key: 'Tuesday', label: 'Selasa' },
    { key: 'Wednesday', label: 'Rabu' },
    { key: 'Thursday', label: 'Kamis' },
    { key: 'Friday', label: 'Jumat' },
    { key: 'Saturday', label: 'Sabtu' },
    { key: 'Sunday', label: 'Minggu' }
];

const ShiftManagement = () => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedDay, setSelectedDay] = useState(() => {
        // Default to current day
        return new Date().toLocaleDateString('en-US', { weekday: 'long' });
    });
    const [staffSchedules, setStaffSchedules] = useState([]);
    const [activeShift, setActiveShiftState] = useState({ shift_label: 'MORNING' });

    // Edit Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [weeklySchedule, setWeeklySchedule] = useState([]);

    // Fetch data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [shiftData, schedules] = await Promise.all([
                getActiveShift(),
                getStaffSchedules(selectedDay)
            ]);
            setActiveShiftState(shiftData || { shift_label: 'MORNING' });
            setStaffSchedules(schedules || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedDay]);

    // Toggle active shift
    const handleToggleShift = async () => {
        const newShift = activeShift.shift_label === 'MORNING' ? 'AFTERNOON' : 'MORNING';
        try {
            await setActiveShift(newShift, user.id);
            setActiveShiftState({ ...activeShift, shift_label: newShift });
            toast.success(`${t('shift.activeShift')}: ${newShift === 'MORNING' ? t('shift.morning') : t('shift.afternoon')}`);
        } catch (error) {
            console.error('Error toggling shift:', error);
            toast.error(t('common.error'));
        }
    };

    // Open edit dialog
    const handleOpenEdit = async (userData) => {
        setEditingUser(userData);
        try {
            const schedule = await getUserSchedule(userData.user_id);
            const fullSchedule = DAYS.map(day => {
                const existing = schedule.find(s => s.day_of_week === day.key);
                return {
                    day_of_week: day.key,
                    morning_role: existing?.morning_role || 'OFF',
                    afternoon_role: existing?.afternoon_role || 'OFF'
                };
            });
            setWeeklySchedule(fullSchedule);
            setDialogOpen(true);
        } catch (error) {
            console.error('Error fetching schedule:', error);
            toast.error(t('common.error'));
        }
    };

    // Update schedule locally
    const handleScheduleChange = (dayIndex, shiftType, value) => {
        setWeeklySchedule(prev => {
            const updated = [...prev];
            updated[dayIndex] = { ...updated[dayIndex], [shiftType]: value };
            return updated;
        });
    };

    // Save schedule
    const handleSaveSchedule = async () => {
        if (!editingUser) return;
        setSaving(true);
        try {
            await updateUserFullSchedule(editingUser.user_id, weeklySchedule);
            toast.success(t('common.success'));
            setDialogOpen(false);
            setEditingUser(null);
            fetchData();
        } catch (error) {
            console.error('Error saving schedule:', error);
            toast.error(t('common.error'));
        } finally {
            setSaving(false);
        }
    };

    // Get role label
    const getRoleLabel = (role) => {
        switch (role) {
            case 'ADMIN': return t('admin.roleAdmin');
            case 'RECEPTIONIST': return t('admin.roleReceptionist');
            case 'SCANNER': return t('admin.roleScanner');
            case 'OFF': return t('shift.off');
            default: return role;
        }
    };

    // Get role badge color
    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'ADMIN': return 'bg-purple-100 text-purple-700';
            case 'RECEPTIONIST': return 'bg-blue-100 text-blue-700';
            case 'SCANNER': return 'bg-green-100 text-green-700';
            default: return 'bg-slate-100 text-slate-500';
        }
    };

    // Get day label
    const getDayLabel = (dayKey) => {
        if (language === 'id') {
            const dayMap = {
                'Monday': 'Senin', 'Tuesday': 'Selasa', 'Wednesday': 'Rabu',
                'Thursday': 'Kamis', 'Friday': 'Jumat', 'Saturday': 'Sabtu', 'Sunday': 'Minggu'
            };
            return dayMap[dayKey] || dayKey;
        }
        return dayKey;
    };

    // Get short day label
    const getShortDayLabel = (dayKey) => {
        const dayMap = {
            'Monday': language === 'id' ? 'Sen' : 'Mon',
            'Tuesday': language === 'id' ? 'Sel' : 'Tue',
            'Wednesday': language === 'id' ? 'Rab' : 'Wed',
            'Thursday': language === 'id' ? 'Kam' : 'Thu',
            'Friday': language === 'id' ? 'Jum' : 'Fri',
            'Saturday': language === 'id' ? 'Sab' : 'Sat',
            'Sunday': language === 'id' ? 'Min' : 'Sun'
        };
        return dayMap[dayKey] || dayKey;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
                        {t('shift.management')}
                    </h1>
                    <p className="text-slate-600 mt-1">{t('shift.subtitle')}</p>
                </div>
                <Button onClick={fetchData} variant="outline" size="icon">
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>

            {/* Active Shift Card */}
            <Card className="p-6 bg-gradient-to-r from-sky-50 to-blue-50 border-sky-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-14 h-14 rounded-full flex items-center justify-center",
                            activeShift.shift_label === 'MORNING' ? "bg-amber-100 text-amber-600" : "bg-indigo-100 text-indigo-600"
                        )}>
                            {activeShift.shift_label === 'MORNING' ? <Sun className="w-7 h-7" /> : <Moon className="w-7 h-7" />}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{t('shift.currentShift')}</p>
                            <p className="text-2xl font-bold text-slate-900">
                                {activeShift.shift_label === 'MORNING' ? t('shift.morning') : t('shift.afternoon')}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={handleToggleShift}
                        className={cn("px-5", activeShift.shift_label === 'MORNING' ? "bg-indigo-600 hover:bg-indigo-700" : "bg-amber-500 hover:bg-amber-600")}
                    >
                        {activeShift.shift_label === 'MORNING' ? (
                            <><Moon className="w-4 h-4 mr-2" />{t('shift.switchToAfternoon')}</>
                        ) : (
                            <><Sun className="w-4 h-4 mr-2" />{t('shift.switchToMorning')}</>
                        )}
                    </Button>
                </div>
            </Card>

            {/* Staff Schedule Card */}
            <Card className="overflow-hidden">
                {/* Day Selector */}
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-slate-500" />
                        <h2 className="text-lg font-semibold text-slate-900">{t('shift.staffSchedule')}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <div className="flex bg-slate-200 rounded-lg p-1">
                            {DAYS.map((day) => (
                                <button
                                    key={day.key}
                                    onClick={() => setSelectedDay(day.key)}
                                    className={cn(
                                        "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                                        selectedDay === day.key
                                            ? "bg-white text-slate-900 shadow-sm"
                                            : "text-slate-600 hover:text-slate-900"
                                    )}
                                >
                                    {getShortDayLabel(day.key)}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Staff Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">{t('admin.name')}</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">{t('auth.email')}</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">{t('admin.role')}</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900">{t('scanner.shift')}</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-900">{t('admin.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {staffSchedules.map((staff) => {
                                const isAdmin = staff.default_role === 'ADMIN';
                                return (
                                    <tr key={staff.user_id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600">
                                                    {staff.name?.charAt(0)}
                                                </div>
                                                <span className="font-medium text-slate-900">{staff.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{staff.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={cn("px-3 py-1 text-xs font-medium rounded-full", getRoleBadgeColor(staff.default_role))}>
                                                {getRoleLabel(staff.default_role)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {isAdmin ? (
                                                <div className="text-center text-sm text-slate-500 italic">
                                                    {t('shift.alwaysAdmin') || 'Always Admin'}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded border border-amber-200">
                                                        <Sun className="w-3 h-3 text-amber-500" />
                                                        <span className="text-xs font-medium text-amber-700">{getRoleLabel(staff.morning_role)}</span>
                                                    </div>
                                                    <span className="text-slate-400">/</span>
                                                    <div className="flex items-center gap-1 px-2 py-1 bg-indigo-50 rounded border border-indigo-200">
                                                        <Moon className="w-3 h-3 text-indigo-500" />
                                                        <span className="text-xs font-medium text-indigo-700">{getRoleLabel(staff.afternoon_role)}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {!isAdmin && (
                                                <Button variant="outline" size="sm" onClick={() => handleOpenEdit(staff)}>
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    {t('common.edit')}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600">
                                {editingUser?.name?.charAt(0)}
                            </div>
                            {editingUser?.name}
                        </DialogTitle>
                        <DialogDescription>{t('shift.weeklyScheduleDesc')}</DialogDescription>
                    </DialogHeader>

                    <div className="mt-4">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="py-3 text-left text-sm font-semibold text-slate-700">{t('admin.days') || 'Day'}</th>
                                    <th className="py-3 text-center text-sm font-semibold text-slate-700">
                                        <span className="flex items-center justify-center gap-1">
                                            <Sun className="w-4 h-4 text-amber-500" />{t('shift.morning')}
                                        </span>
                                    </th>
                                    <th className="py-3 text-center text-sm font-semibold text-slate-700">
                                        <span className="flex items-center justify-center gap-1">
                                            <Moon className="w-4 h-4 text-indigo-500" />{t('shift.afternoon')}
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {weeklySchedule.map((day, idx) => (
                                    <tr key={day.day_of_week} className="border-b border-slate-100">
                                        <td className="py-3 text-sm font-medium text-slate-700">{getDayLabel(day.day_of_week)}</td>
                                        <td className="py-2 px-2">
                                            <Select value={day.morning_role} onValueChange={(v) => handleScheduleChange(idx, 'morning_role', v)}>
                                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {ROLES.filter(r => r !== 'ADMIN').map(role => (
                                                        <SelectItem key={role} value={role}>{getRoleLabel(role)}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className="py-2 px-2">
                                            <Select value={day.afternoon_role} onValueChange={(v) => handleScheduleChange(idx, 'afternoon_role', v)}>
                                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {ROLES.filter(r => r !== 'ADMIN').map(role => (
                                                        <SelectItem key={role} value={role}>{getRoleLabel(role)}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
                        <Button onClick={handleSaveSchedule} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? t('admin.saving') : t('shift.saveSchedule')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ShiftManagement;
