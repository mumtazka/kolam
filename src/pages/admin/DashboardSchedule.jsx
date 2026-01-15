import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, getDate, isSameDay } from 'date-fns';
import { id, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { getSessions } from '../../services/adminService';
import { useLanguage } from '../../contexts/LanguageContext';

const DashboardSchedule = () => {
    const { t, language } = useLanguage();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [allSessions, setAllSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    const locale = language === 'id' ? id : enUS;

    // Generate week days for the calendar strip
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getSessions();
            setAllSessions(data || []);
        } catch (error) {
            console.error("Failed to fetch sessions", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevWeek = () => setCurrentDate(sub => addDays(sub, -7));
    const handleNextWeek = () => setCurrentDate(add => addDays(add, 7));

    // Helper to get day name (e.g., 'Monday')
    const getDayName = (d) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[d.getDay()];
    };

    // Filter sessions for selected date
    const selectedDayName = getDayName(selectedDate);
    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

    const filteredSessions = allSessions.filter(session => {
        // 1. Check Day match (e.g. "Monday" in ["Monday", "Wednesday"])
        // If sessions have a 'days' array (recurring)
        if (session.days && Array.isArray(session.days)) {
            if (!session.days.includes(selectedDayName)) return false;
        }

        // 2. Contract/Validity Logic
        if (session.valid_until) {
            // If date-specific (single session non-recurring), must match exact date
            if (!session.is_recurring) {
                if (session.valid_from !== selectedDateStr) return false;
            } else {
                // If recurring with contract
                if (session.valid_from && selectedDateStr < session.valid_from) return false;
                if (session.valid_until && selectedDateStr > session.valid_until) return false;
            }
        } else if (!session.is_recurring) {
            // Non-recurring, no valid_until? Should imply valid_from is the date
            if (session.valid_from !== selectedDateStr) return false;
        }

        return true;
    });

    const CalendarDay = ({ date }) => {
        const isSelected = isSameDay(date, selectedDate);
        const dayName = format(date, 'EEE', { locale });
        const dayNumber = getDate(date);

        // Check if there are sessions on this day
        const dayNameStr = getDayName(date);
        const dateStr = format(date, 'yyyy-MM-dd');
        const hasSessions = allSessions.some(session => {
            if (session.days && Array.isArray(session.days)) {
                if (!session.days.includes(dayNameStr)) return false;
            }
            return true; // Simplified check for dot indicator
        });

        return (
            <div
                className={`flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 ${isSelected ? '-mt-1' : ''}`}
                onClick={() => setSelectedDate(date)}
            >
                <span className={`text-xs font-medium ${isSelected ? 'text-teal-600' : 'text-slate-400'}`}>
                    {dayName}
                </span>
                <div className={`
          w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 relative
          ${isSelected
                        ? 'bg-teal-500 text-white shadow-lg shadow-teal-200 scale-110'
                        : 'bg-transparent text-slate-600 hover:bg-slate-100'}
        `}>
                    {dayNumber}
                    {/* Dot indicator if not selected but has sessions? Optional aesthetic */}
                </div>
            </div>
        );
    };

    const SessionItem = ({ session }) => {
        // Determine color based on index or random? Or just uniform
        // Let's alternate colors based on first letter or ID
        const colors = [
            'border-l-indigo-500 bg-indigo-50/30',
            'border-l-teal-500 bg-teal-50/30',
            'border-l-rose-500 bg-rose-50/30',
            'border-l-amber-500 bg-amber-50/30'
        ];
        // Simple hash to pick color
        const colorIdx = (session.name?.length || 0) % colors.length;
        const colorClass = colors[colorIdx];
        const barColor = colorClass.split(' ')[0].replace('border-l-', 'bg-');

        return (
            <div className={`relative pl-5 py-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 mb-3 group overflow-hidden border-l-[6px] ${colorClass.split(' ')[0]}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-slate-900 text-xl group-hover:text-teal-700 transition-colors">
                            {session.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                                <Clock className="w-4 h-4" />
                                {session.start_time?.substring(0, 5)} - {session.end_time?.substring(0, 5)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-slate-50/50 rounded-2xl p-2 gap-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-slate-900 text-lg" style={{ fontFamily: 'Outfit' }}>
                    {format(selectedDate, 'MMMM yyyy', { locale })}
                </h3>
                <div className="flex gap-1">
                    <button onClick={handlePrevWeek} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={handleNextWeek} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Days Strip */}
            <div className="flex justify-between items-center px-2">
                {weekDays.map((date, i) => (
                    <CalendarDay key={i} date={date} />
                ))}
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent w-full"></div>

            {/* Session List */}
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
                        {isSameDay(selectedDate, new Date()) ? (language === 'id' ? 'Hari Ini' : 'Today') : format(selectedDate, 'EEE, MMM dd', { locale })}
                    </h3>
                    <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                        {filteredSessions.length}
                    </span>
                </div>

                {loading ? (
                    <div className="flex justify-center py-8"><div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>
                ) : filteredSessions.length > 0 ? (
                    <div className="space-y-1">
                        {filteredSessions.map(session => (
                            <SessionItem key={session.id} session={session} />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                            <CalendarIcon className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-slate-500 text-sm font-medium">No sessions scheduled</p>
                        <p className="text-slate-400 text-xs mt-1">Select another date</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardSchedule;
