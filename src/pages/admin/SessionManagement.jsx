import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Plus, Edit, Trash2, Clock, Calendar as CalendarIcon, MapPin, Hash, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Calendar } from '../../components/ui/calendar';
import { getSessions, createSession, updateSession, deleteSession } from '../../services/adminService';
import { id, enUS } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { ScrollArea } from '../../components/ui/scroll-area';



const TimeBlock = ({ val, type, max, onUpdate }) => (
    <div className="flex items-center gap-1">
        <Input
            className="w-[4.5rem] h-12 text-center font-mono text-xl font-bold p-0 transition-all"
            value={val}
            onChange={(e) => {
                let v = e.target.value;
                if (v.length > 2) v = v.slice(0, 2);
                onUpdate(v);
            }}
            onBlur={(e) => {
                let v = e.target.value.replace(/\D/g, '').padStart(2, '0');
                if (parseInt(v) > max) v = max.toString().padStart(2, '0');
                if (isNaN(parseInt(v))) v = '00';
                onUpdate(v);
            }}
            placeholder={type === 'hour' ? 'HH' : 'MM'}
            maxLength={2}
        />
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full"
                    tabIndex={-1}
                >
                    <ChevronDown className="w-4 h-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-24 p-0" align="center" sideOffset={5}>
                <div className="h-64 overflow-y-auto p-1 custom-scrollbar">
                    {(type === 'hour'
                        ? Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
                        : ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']
                    ).map((item) => (
                        <div
                            key={item}
                            className={`px-2 py-2 text-center text-lg font-medium cursor-pointer rounded-md hover:bg-slate-100 transition-colors ${val === item ? 'bg-slate-900 text-white hover:bg-slate-800' : 'text-slate-700'}`}
                            onClick={() => onUpdate(item)}
                        >
                            {item}
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    </div>
);

const TimePickerInput = ({ value, onChange, label }) => {
    // Ensure value is valid
    const [hh = '00', mm = '00'] = (value || '00:00').split(':');

    // Helper to update specific part
    const updateTime = (part, newVal) => {
        if (part === 'hour') {
            onChange(`${newVal}:${mm}`);
        } else {
            onChange(`${hh}:${newVal}`);
        }
    };

    return (
        <div className="space-y-2">
            <Label className="font-semibold text-slate-700">{label}</Label>
            <div className="flex items-center gap-2">
                <TimeBlock val={hh} type="hour" max={23} onUpdate={(v) => updateTime('hour', v)} />
                <span className="text-xl font-bold text-slate-300 pb-1">:</span>
                <TimeBlock val={mm} type="minute" max={59} onUpdate={(v) => updateTime('minute', v)} />
            </div>
        </div>
    );
};

const SessionManagement = () => {
    const { t, language } = useLanguage();

    const DAYS_OF_WEEK = [
        { id: 'Monday', label: t('common.days.Mon') },
        { id: 'Tuesday', label: t('common.days.Tue') },
        { id: 'Wednesday', label: t('common.days.Wed') },
        { id: 'Thursday', label: t('common.days.Thu') },
        { id: 'Friday', label: t('common.days.Fri') },
        { id: 'Saturday', label: t('common.days.Sat') },
        { id: 'Sunday', label: t('common.days.Sun') }
    ];

    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSession, setEditingSession] = useState(null);
    const [date, setDate] = useState(new Date());
    const [formData, setFormData] = useState({
        name: '',
        start_time: '07:00',
        end_time: '08:30',
        days: [],
        is_recurring: true
    });

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const data = await getSessions();
            setSessions(data);
        } catch (error) {
            console.error(error);
            toast.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.days.length === 0) {
            toast.error(t('admin.selectAtLeastOneDay'));
            return;
        }

        try {
            if (editingSession) {
                await updateSession(editingSession.id, formData);
                toast.success(t('common.success'));
            } else {
                await createSession(formData);
                toast.success(t('common.success'));
            }
            setDialogOpen(false);
            setEditingSession(null);
            resetForm();
            fetchSessions();
        } catch (error) {
            console.error(error);
            toast.error(error.message || t('common.error'));
        }
    };

    const handleDelete = async (sessionId) => {
        if (window.confirm(t('admin.confirmStatusChange'))) {
            try {
                await deleteSession(sessionId);
                toast.success(t('common.success'));
                fetchSessions();
            } catch (error) {
                console.error(error);
                toast.error(t('common.error'));
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            start_time: '07:00',
            end_time: '08:30',
            days: [],
            is_recurring: true,
            valid_from: null,
            valid_until: null
        });
    };

    const openEditDialog = (session) => {
        setEditingSession(session);
        setFormData({
            name: session.name,
            start_time: session.start_time,
            end_time: session.end_time,
            days: session.days || [],
            is_recurring: session.is_recurring,
            valid_from: session.valid_from,
            valid_until: session.valid_until
        });
        setDialogOpen(true);
    };

    const openCreateDialog = () => {
        setEditingSession(null);
        resetForm();
        setDialogOpen(true);
    };

    const toggleDay = (dayId) => {
        setFormData(prev => ({
            ...prev,
            days: prev.days.includes(dayId)
                ? prev.days.filter(d => d !== dayId)
                : [...prev.days, dayId]
        }));
    };

    // Helper to get day name from date
    const getDayName = (d) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[d.getDay()];
    };

    // Filter sessions for selected date
    const selectedDayName = date ? getDayName(date) : '';

    const filteredSessions = sessions.filter(session => {
        const matchesDay = session.days && session.days.includes(selectedDayName);
        if (!matchesDay) return false;

        // Contract logic
        if (session.valid_until) {
            const today = new Date().toISOString().split('T')[0];
            if (session.valid_until < today) return false;
        }
        return true;
    });

    // Format date for display
    const formattedDate = date ? date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const formattedDay = date ? date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long' }) : '';

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>{t('admin.sessions')}</h1>
                    <p className="text-slate-600 mt-1">{t('admin.sessionsSubtitle')}</p>
                </div>
                <Button onClick={openCreateDialog} className="bg-slate-900 hover:bg-slate-800" data-testid="create-session-button">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('admin.addSession')}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Calendar */}
                <div className="lg:col-span-6 xl:col-span-6">
                    <Card className="p-6 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-2 text-slate-900">
                                <CalendarIcon className="w-5 h-5 text-sky-600" />
                                <h2 className="text-xl font-bold">{t('common.calendar')}</h2>
                            </div>
                        </div>
                        <div className="flex-1 flex justify-center">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="rounded-md border shadow-sm p-6 w-full flex justify-center"
                                classNames={{
                                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                                    month: "space-y-4",
                                    caption: "flex justify-center pt-1 relative items-center",
                                    caption_label: "text-xl font-bold text-slate-900",
                                    nav: "space-x-1 flex items-center",
                                    nav_button: "h-9 w-9 bg-transparent p-0 opacity-50 hover:opacity-100",
                                    nav_button_previous: "absolute left-1",
                                    nav_button_next: "absolute right-1",
                                    table: "w-full border-collapse space-y-1",
                                    head_row: "flex",
                                    head_cell: "text-slate-500 rounded-md w-14 font-bold text-lg",
                                    row: "flex w-full mt-2",
                                    cell: "h-14 w-14 text-center text-lg p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-slate-100/50 [&:has([aria-selected])]:bg-slate-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                    day: "h-14 w-14 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 rounded-full transition-colors text-lg",
                                    day_range_end: "day-range-end",
                                    day_selected: "bg-slate-900 text-white hover:bg-slate-900 hover:text-white focus:bg-slate-900 focus:text-white",
                                    day_today: "bg-slate-100 text-slate-900 font-bold",
                                    day_outside: "day-outside text-slate-300 opacity-50 aria-selected:bg-slate-100/50 aria-selected:text-slate-500 aria-selected:opacity-30",
                                    day_disabled: "text-slate-300 opacity-50",
                                    day_range_middle: "aria-selected:bg-slate-100 aria-selected:text-slate-900",
                                    day_hidden: "invisible",
                                }}
                                locale={language === 'id' ? id : enUS}
                                components={{
                                    DayContent: (props) => {
                                        const { date: dayDate } = props;
                                        const dayName = getDayName(dayDate);

                                        // Format calendar date to YYYY-MM-DD for comparison
                                        const year = dayDate.getFullYear();
                                        const month = String(dayDate.getMonth() + 1).padStart(2, '0');
                                        const day = String(dayDate.getDate()).padStart(2, '0');
                                        const dateStr = `${year}-${month}-${day}`;

                                        const count = sessions.filter(s => {
                                            if (!s.days || !s.days.includes(dayName)) return false;

                                            // Check contract validity
                                            if (s.valid_from && dateStr < s.valid_from) return false;
                                            if (s.valid_until && dateStr > s.valid_until) return false;

                                            return true;
                                        }).length;

                                        return (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                {props.date.getDate()}
                                                {count > 0 && (
                                                    <div className="absolute bottom-1 w-1.5 h-1.5 bg-sky-500 rounded-full" title={`${count} sessions`}></div>
                                                )}
                                            </div>
                                        );
                                    }
                                }}
                            />
                        </div>
                    </Card>
                </div>

                {/* Right Column: Session List */}
                <div className="lg:col-span-6 xl:col-span-6">
                    <Card className="p-6 min-h-[500px] flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center space-x-2">
                                <CalendarIcon className="w-5 h-5 text-sky-600" />
                                <h2 className="text-xl font-bold text-slate-900">{t('admin.sessionList')}: {formattedDate}</h2>
                            </div>
                            <span className="px-3 py-1 bg-slate-100 text-slate-900 font-medium rounded-md border border-slate-200">
                                {formattedDay}
                            </span>
                        </div>

                        {filteredSessions.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                <Clock className="w-12 h-12 text-slate-300 mb-3" />
                                <p className="text-slate-500 font-medium text-lg">{t('admin.noSessionsScheduled')}</p>
                                <p className="text-sm text-slate-400 mb-6">{t('admin.noSessionsForDay')}</p>
                                <Button onClick={openCreateDialog} variant="outline" className="border-slate-300 hover:bg-white text-slate-600">
                                    <Plus className="w-4 h-4 mr-2" />
                                    {t('admin.addSession')}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredSessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all duration-200 hover:border-sky-300"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-sky-700 transition-colors">
                                                    {session.name}
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {session.days?.map(day => (
                                                        <span key={day} className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${day === selectedDayName
                                                            ? 'bg-sky-100 text-sky-700 border-sky-200'
                                                            : 'bg-slate-50 text-slate-400 border-slate-100'
                                                            }`}>
                                                            {t(`common.days.${day.substring(0, 3)}`)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="inline-flex items-center bg-sky-500 text-white px-3 py-1 rounded-md text-sm font-bold shadow-sm mb-2">
                                                    {session.start_time?.substring(0, 5)} - {session.end_time?.substring(0, 5)}
                                                </div>
                                                <p className="text-slate-400 text-xs font-medium">
                                                    {session.valid_until && session.valid_until < new Date().toISOString().split('T')[0] ? (
                                                        <span className="text-red-500 font-bold flex items-center justify-end gap-1">
                                                            <Trash2 className="w-3 h-3" /> Expired
                                                        </span>
                                                    ) : (
                                                        session.is_recurring ? t('admin.recurring') : t('admin.oneTime')
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1 bg-white shadow-sm rounded-lg border border-slate-100 p-1">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 hover:bg-slate-50 hover:text-sky-600"
                                                onClick={() => openEditDialog(session)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                                                onClick={() => handleDelete(session.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Bottom Section: All Sessions List */}
                <div className="col-span-1 lg:col-span-12">
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900">{t('admin.allSessions')}</h2>
                        </div>

                        <div className="rounded-md border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">{t('admin.sessionName')}</th>
                                        <th className="px-4 py-3">{t('admin.days')}</th>
                                        <th className="px-4 py-3">{t('admin.time')}</th>
                                        <th className="px-4 py-3">{t('admin.contract')}</th>
                                        <th className="px-4 py-3 text-right">{t('admin.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sessions.filter(s => {
                                        if (s.valid_until && s.valid_until < new Date().toISOString().split('T')[0]) return false;
                                        return true;
                                    }).length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                                                {t('admin.noSessions')}
                                            </td>
                                        </tr>
                                    ) : (
                                        sessions.filter(s => {
                                            if (s.valid_until && s.valid_until < new Date().toISOString().split('T')[0]) return false;
                                            return true;
                                        }).map((session) => (
                                            <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-900">{session.name}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {session.days?.map(day => (
                                                            <span key={day} className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                                                                {t(`common.days.${day.substring(0, 3)}`)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-slate-600">
                                                    {session.start_time?.substring(0, 5)} - {session.end_time?.substring(0, 5)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {session.valid_from || session.valid_until ? (
                                                        <div className="text-xs space-y-0.5">
                                                            {session.valid_from && (
                                                                <div className="text-emerald-600">
                                                                    <span className="font-semibold">From:</span> {new Date(session.valid_from).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB')}
                                                                </div>
                                                            )}
                                                            {session.valid_until && (
                                                                <div className="text-amber-600">
                                                                    <span className="font-semibold">Until:</span> {new Date(session.valid_until).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">{t('admin.noContract')}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end space-x-1">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 hover:bg-slate-100 hover:text-sky-600"
                                                            onClick={() => openEditDialog(session)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                                                            onClick={() => handleDelete(session.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent data-testid="session-form-dialog">
                    <DialogHeader>
                        <DialogTitle>{editingSession ? t('admin.editSession') : t('admin.newSession')}</DialogTitle>
                        <DialogDescription className="text-sm text-slate-500">
                            {editingSession ? t('admin.sessionFormDescriptionUpdate') : t('admin.sessionFormDescriptionCreate')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="name">{t('admin.sessionName')}</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Session 1, Club Caesar"
                                required
                                data-testid="session-name-input"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-2">
                            <TimePickerInput
                                label={t('admin.startTime')}
                                value={formData.start_time}
                                onChange={(val) => setFormData({ ...formData, start_time: val })}
                            />
                            <TimePickerInput
                                label={t('admin.endTime')}
                                value={formData.end_time}
                                onChange={(val) => setFormData({ ...formData, end_time: val })}
                            />
                        </div>

                        <div>
                            <Label className="mb-3 block">{t('admin.daysOfWeek')}</Label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map(day => (
                                    <button
                                        key={day.id}
                                        type="button"
                                        onClick={() => toggleDay(day.id)}
                                        className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${formData.days.includes(day.id)
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                                            }`}
                                        data-testid={`session-day-${day.id.toLowerCase()}`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <Label htmlFor="is_recurring" className="cursor-pointer">{t('admin.recurringSession')}</Label>
                            <Switch
                                id="is_recurring"
                                checked={formData.is_recurring}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                                data-testid="session-recurring-switch"
                            />
                        </div>

                        <div className="flex items-center justify-between py-2 border-t border-slate-100 mt-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="has_contract" className="text-base font-semibold text-slate-900">{t('admin.enableContract')}</Label>
                                <p className="text-sm text-slate-500">{t('admin.contractDescription')}</p>
                            </div>
                            <Switch
                                id="has_contract"
                                checked={!!formData.valid_until}
                                onCheckedChange={(checked) => {
                                    if (!checked) {
                                        setFormData(prev => ({ ...prev, valid_from: null, valid_until: null }));
                                    } else {
                                        // Default to today + 1 month
                                        const now = new Date();
                                        const nextMonth = new Date(now);
                                        nextMonth.setMonth(now.getMonth() + 1);
                                        setFormData(prev => ({
                                            ...prev,
                                            valid_from: now.toISOString().split('T')[0],
                                            valid_until: nextMonth.toISOString().split('T')[0]
                                        }));
                                    }
                                }}
                            />
                        </div>

                        {formData.valid_until && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label htmlFor="valid_from">{t('admin.validFrom')}</Label>
                                    <Input
                                        id="valid_from"
                                        type="date"
                                        value={formData.valid_from || ''}
                                        onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="valid_until">{t('admin.validUntil')}</Label>
                                    <Input
                                        id="valid_until"
                                        type="date"
                                        value={formData.valid_until || ''}
                                        onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                                        min={formData.valid_from}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex space-x-2 pt-6 border-t border-slate-100">
                            <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800" data-testid="session-form-submit">
                                {editingSession ? t('admin.update') : t('admin.create')}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                                {t('common.cancel')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SessionManagement;
