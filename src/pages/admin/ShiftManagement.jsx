import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Sunrise, Sunset, Edit, RefreshCw, Save, Users, Calendar, ScanLine, Calculator, Coffee, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import {
    getStaffSchedules,
    getUserSchedule,
    updateUserFullSchedule
} from '../../services/shiftService';

const ROLES = ['OFF', 'RECEPTIONIST', 'SCANNER'];
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


    // Edit Dialog State
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [weeklySchedule, setWeeklySchedule] = useState([]);

    const [refreshing, setRefreshing] = useState(false);

    // Fetch data
    const fetchData = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const schedules = await getStaffSchedules(selectedDay);
            setStaffSchedules(schedules || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error(t('common.error'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedDay]);



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
            // For the main role column, show "Staff" for non-admin
            case 'RECEPTIONIST': return t('admin.roleStaff') || 'Staff';
            case 'SCANNER': return t('admin.roleStaff') || 'Staff';
            case 'OFF': return t('shift.off');
            // For subroles in shift schedule
            case 'CASHIER': return t('admin.roleCashier');
            default: return role;
        }
    };

    // Get subrole label (for shift dropdowns)
    const getSubRoleLabel = (role) => {
        switch (role) {
            case 'CASHIER': return t('admin.roleCashier');
            case 'RECEPTIONIST': return t('admin.roleCashier'); // Legacy mapping
            case 'SCANNER': return t('admin.roleScanner');
            case 'OFF': return t('shift.off');
            default: return role;
        }
    };

    // Get role badge color (for main role column)
    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'ADMIN': return 'bg-purple-100 text-purple-700';
            // Staff gets blue
            case 'RECEPTIONIST': return 'bg-teal-100 text-teal-700';
            case 'SCANNER': return 'bg-teal-100 text-teal-700';
            default: return 'bg-slate-100 text-slate-500';
        }
    };

    // Get icon for role
    const getRoleIcon = (role) => {
        switch (role) {
            case 'CASHIER':
            case 'RECEPTIONIST':
                return Calculator;
            case 'SCANNER':
                return ScanLine;
            case 'OFF':
                return Coffee;
            default:
                return Ban;
        }
    };

    // Get role badge style (text only now)
    const getShiftRoleStyle = (role) => {
        switch (role) {
            case 'CASHIER':
            case 'RECEPTIONIST':
                return 'text-teal-600';
            case 'SCANNER':
                return 'text-teal-600';
            case 'OFF':
            default:
                return 'text-slate-400';
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
            <div className="flex items-center justify-end">
                <Button
                    onClick={() => fetchData(true)}
                    variant="outline"
                    size="icon"
                    disabled={refreshing}
                >
                    <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                </Button>
            </div>


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
                                <th className="w-[20%] px-4 py-3 text-left text-sm font-semibold text-slate-900">{t('admin.name')}</th>
                                <th className="w-[25%] px-4 py-3 text-left text-sm font-semibold text-slate-900">{t('auth.email')}</th>
                                <th className="w-[15%] px-4 py-3 text-center text-sm font-semibold text-slate-900">{t('admin.role')}</th>
                                <th className="w-[15%] px-4 py-3 text-center text-sm font-semibold text-slate-900">
                                    <div className="flex items-center justify-center gap-1">
                                        <Sunrise className="w-4 h-4 text-amber-500" />
                                        {t('shift.morning')}
                                    </div>
                                </th>
                                <th className="w-[15%] px-4 py-3 text-center text-sm font-semibold text-slate-900">
                                    <div className="flex items-center justify-center gap-1">
                                        <Sunset className="w-4 h-4 text-indigo-500" />
                                        {t('shift.afternoon')}
                                    </div>
                                </th>
                                <th className="w-[10%] px-4 py-3 text-center text-sm font-semibold text-slate-900">{t('admin.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {staffSchedules.map((staff) => {
                                const isAdmin = staff.default_role === 'ADMIN';
                                return (
                                    <tr key={staff.user_id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center font-bold text-slate-600 text-xs">
                                                    {staff.name?.charAt(0)}
                                                </div>
                                                <span className="font-medium text-slate-900">{staff.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{staff.email}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={cn("text-sm font-medium", getRoleBadgeColor(staff.default_role).replace('bg-purple-100', '').replace('bg-blue-100', '').replace('px-3', '').replace('py-1', '').replace('rounded-full', ''))}>
                                                {getRoleLabel(staff.default_role)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3" colSpan={isAdmin ? 2 : 1}>
                                            {isAdmin ? (
                                                <div className="text-center text-sm text-slate-500 italic">
                                                    {t('shift.alwaysAdmin') || 'Always Admin'}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center">
                                                    {(() => {
                                                        const RoleIcon = getRoleIcon(staff.morning_role);
                                                        const colorClass = getShiftRoleStyle(staff.morning_role);
                                                        return (
                                                            <div className={`flex items-center gap-2 justify-center ${colorClass}`}>
                                                                <RoleIcon className="w-5 h-5" />
                                                                <span className="text-base font-bold">{getSubRoleLabel(staff.morning_role)}</span>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </td>
                                        {!isAdmin && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center">
                                                    {(() => {
                                                        const RoleIcon = getRoleIcon(staff.afternoon_role);
                                                        const colorClass = getShiftRoleStyle(staff.afternoon_role);
                                                        return (
                                                            <div className={`flex items-center gap-2 justify-center ${colorClass}`}>
                                                                <RoleIcon className="w-5 h-5" />
                                                                <span className="text-base font-bold">{getSubRoleLabel(staff.afternoon_role)}</span>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                        )}
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
                                    <th className="py-3 text-left text-sm font-semibold text-slate-700 w-1/4">{t('admin.days') || 'Day'}</th>
                                    <th className="py-3 text-center text-sm font-semibold text-slate-700 w-1/3">
                                        <span className="flex items-center justify-center gap-1">
                                            <Sunrise className="w-4 h-4 text-amber-500" />{t('shift.morning')}
                                        </span>
                                    </th>
                                    <th className="py-3 text-center text-sm font-semibold text-slate-700 w-1/3">
                                        <span className="flex items-center justify-center gap-1">
                                            <Sunset className="w-4 h-4 text-indigo-500" />{t('shift.afternoon')}
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
                                                    {ROLES.map(role => (
                                                        <SelectItem key={role} value={role}>{getSubRoleLabel(role)}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className="py-2 px-2">
                                            <Select value={day.afternoon_role} onValueChange={(v) => handleScheduleChange(idx, 'afternoon_role', v)}>
                                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {ROLES.map(role => (
                                                        <SelectItem key={role} value={role}>{getSubRoleLabel(role)}</SelectItem>
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
                        <Button onClick={handleSaveSchedule} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
                            {saving ? (
                                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />{t('common.saving')}...</>
                            ) : (
                                <><Save className="w-4 h-4 mr-2" />{t('shift.saveSchedule')}</>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ShiftManagement;
