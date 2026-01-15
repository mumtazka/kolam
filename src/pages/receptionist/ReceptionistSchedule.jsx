import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Calendar } from '../../components/ui/calendar';
import { getSessions } from '../../services/adminService';
import { id, enUS } from 'date-fns/locale';

const ReceptionistSchedule = () => {
    const { t, language } = useLanguage();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date());

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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Calendar */}
                <div className="lg:col-span-6 xl:col-span-6">
                    <Card className="p-6 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-2 text-slate-900">
                                <CalendarIcon className="w-5 h-5 text-teal-600" />
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
                                    day_selected: "bg-teal-600 text-white hover:bg-teal-600 hover:text-white focus:bg-teal-600 focus:text-white",
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
                                                    <div className="absolute bottom-1 w-1.5 h-1.5 bg-teal-500 rounded-full" title={`${count} sessions`}></div>
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
                                <CalendarIcon className="w-5 h-5 text-teal-600" />
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
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredSessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className="group relative bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all duration-200 hover:border-teal-300"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-teal-700 transition-colors">
                                                    {session.name}
                                                </h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {session.days?.map(day => (
                                                        <span key={day} className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${day === selectedDayName
                                                            ? 'bg-teal-100 text-teal-700 border-teal-200'
                                                            : 'bg-slate-50 text-slate-400 border-slate-100'
                                                            }`}>
                                                            {t(`common.days.${day.substring(0, 3)}`)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="inline-flex items-center bg-teal-500 text-white px-3 py-1 rounded-md text-sm font-bold shadow-sm mb-2">
                                                    {session.start_time?.substring(0, 5)} - {session.end_time?.substring(0, 5)}
                                                </div>
                                                <p className="text-slate-400 text-xs font-medium">
                                                    {session.valid_until && session.valid_until < new Date().toISOString().split('T')[0] ? (
                                                        <span className="text-red-500 font-bold flex items-center justify-end gap-1">
                                                            Expired
                                                        </span>
                                                    ) : (
                                                        session.is_recurring ? t('admin.recurring') : t('admin.oneTime')
                                                    )}
                                                </p>
                                            </div>
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
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ReceptionistSchedule;
