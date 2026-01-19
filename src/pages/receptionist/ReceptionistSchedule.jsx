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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
                {/* Left Column: Calendar */}
                <div className="lg:col-span-6 xl:col-span-6 order-2 lg:order-1">
                    <Card className="p-3 sm:p-4 md:p-6 h-full flex flex-col">
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <div className="flex items-center space-x-2 text-slate-900">
                                <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-teal-600" />
                                <h2 className="text-base sm:text-lg md:text-xl font-bold">{t('common.calendar')}</h2>
                            </div>
                        </div>
                        <div className="flex-1 flex justify-center">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="rounded-md border shadow-sm p-2 sm:p-4 md:p-6 w-full flex justify-center"
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
                                    head_row: "flex justify-between",
                                    head_cell: "text-slate-500 rounded-md w-8 sm:w-10 md:w-12 lg:w-14 font-semibold text-xs sm:text-sm md:text-base lg:text-lg text-center",
                                    row: "flex w-full mt-1 sm:mt-2 justify-between",
                                    cell: "h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 text-center text-sm sm:text-base md:text-lg p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-slate-100/50 [&:has([aria-selected])]:bg-slate-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                                    day: "h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 p-0 font-normal aria-selected:opacity-100 hover:bg-slate-100 rounded-full transition-colors text-sm sm:text-base md:text-lg",
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
                <div className="lg:col-span-6 xl:col-span-6 order-1 lg:order-2">
                    <Card className="p-3 sm:p-4 md:p-6 min-h-[300px] md:min-h-[400px] lg:min-h-[500px] flex flex-col">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4 md:mb-8">
                            <div className="flex items-center space-x-2 min-w-0">
                                <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-teal-600 flex-shrink-0" />
                                <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-slate-900 truncate">
                                    {t('admin.sessionList')}: <span className="hidden sm:inline">{formattedDate}</span>
                                    <span className="sm:hidden">{date?.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short' })}</span>
                                </h2>
                            </div>
                            <span className="px-2 py-1 sm:px-3 bg-slate-100 text-slate-900 font-medium rounded-md border border-slate-200 text-xs sm:text-sm w-fit">
                                {formattedDay}
                            </span>
                        </div>

                        {filteredSessions.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 sm:p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                                <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mb-3" />
                                <p className="text-slate-500 font-medium text-base sm:text-lg">{t('admin.noSessionsScheduled')}</p>
                                <p className="text-xs sm:text-sm text-slate-400 mb-6">{t('admin.noSessionsForDay')}</p>
                            </div>
                        ) : (
                            <div className="space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                                {filteredSessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className="group relative bg-white border border-slate-200 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 hover:shadow-md transition-all duration-200 hover:border-teal-300"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4">
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-bold text-sm sm:text-base md:text-lg text-slate-900 mb-1 group-hover:text-teal-700 transition-colors truncate">
                                                    {session.name}
                                                </h3>
                                                <div className="flex flex-wrap gap-1 sm:gap-2">
                                                    {session.days?.map(day => (
                                                        <span key={day} className={`text-[8px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded uppercase border ${day === selectedDayName
                                                            ? 'bg-teal-100 text-teal-700 border-teal-200'
                                                            : 'bg-slate-50 text-slate-400 border-slate-100'
                                                            }`}>
                                                            {t(`common.days.${day.substring(0, 3)}`)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="text-left sm:text-right flex-shrink-0">
                                                <div className="inline-flex items-center bg-slate-900 text-white px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-bold shadow-sm mb-1 sm:mb-2">
                                                    {session.start_time?.substring(0, 5)} - {session.end_time?.substring(0, 5)}
                                                </div>
                                                <p className="text-slate-400 text-[10px] sm:text-xs font-medium">
                                                    {session.valid_until && session.valid_until < new Date().toISOString().split('T')[0] ? (
                                                        <span className="text-red-500 font-bold flex items-center sm:justify-end gap-1">
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
                <div className="col-span-1 lg:col-span-12 order-3">
                    <Card className="p-3 sm:p-4 md:p-6">
                        <div className="flex items-center justify-between mb-4 md:mb-6">
                            <h2 className="text-base sm:text-lg md:text-xl font-bold text-slate-900">{t('admin.allSessions')}</h2>
                        </div>

                        <div className="rounded-md border border-slate-200 overflow-x-auto">
                            <table className="w-full text-xs sm:text-sm text-left min-w-[500px]">
                                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">{t('admin.sessionName')}</th>
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">{t('admin.days')}</th>
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">{t('admin.time')}</th>
                                        <th className="px-2 sm:px-4 py-2 sm:py-3 whitespace-nowrap">{t('admin.contract')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {sessions.filter(s => {
                                        if (s.valid_until && s.valid_until < new Date().toISOString().split('T')[0]) return false;
                                        if (!s.is_recurring) return false; // Filter out non-recurring sessions
                                        return true;
                                    }).length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                                                {t('admin.noSessions')}
                                            </td>
                                        </tr>
                                    ) : (
                                        sessions.filter(s => {
                                            if (s.valid_until && s.valid_until < new Date().toISOString().split('T')[0]) return false;
                                            if (!s.is_recurring) return false; // Filter out non-recurring sessions
                                            return true;
                                        }).map((session) => (
                                            <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 font-medium text-slate-900 whitespace-nowrap">{session.name}</td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {session.days?.map(day => (
                                                            <span key={day} className="text-[8px] sm:text-[10px] uppercase font-bold px-1 sm:px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                                                                {t(`common.days.${day.substring(0, 3)}`)}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3 font-mono text-slate-600 whitespace-nowrap">
                                                    {session.start_time?.substring(0, 5)} - {session.end_time?.substring(0, 5)}
                                                </td>
                                                <td className="px-2 sm:px-4 py-2 sm:py-3">
                                                    {session.valid_from || session.valid_until ? (
                                                        <div className="text-[10px] sm:text-xs space-y-0.5 whitespace-nowrap">
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
                                                        <span className="text-[10px] sm:text-xs text-slate-400 italic">{t('admin.noContract')}</span>
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
