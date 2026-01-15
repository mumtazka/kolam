import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const IndonesianMiniCalendar = ({ selectedDate, onDateSelect }) => {
    const [currentMonth, setCurrentMonth] = useState(() => {
        // If selectedDate is valid, use it. Otherwise use today.
        const date = selectedDate ? new Date(selectedDate) : new Date();
        // Validate date - if invalid date, fallback to today
        if (isNaN(date.getTime())) {
            const today = new Date();
            return new Date(today.getFullYear(), today.getMonth(), 1);
        }
        return new Date(date.getFullYear(), date.getMonth(), 1);
    });

    // Indonesian day names (short)
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    // Indonesian month names
    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();

        const days = [];

        // Previous month days
        const prevMonth = new Date(year, month, 0);
        const prevMonthDays = prevMonth.getDate();
        for (let i = startingDay - 1; i >= 0; i--) {
            days.push({
                day: prevMonthDays - i,
                isCurrentMonth: false,
                date: new Date(year, month - 1, prevMonthDays - i)
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                day: i,
                isCurrentMonth: true,
                date: new Date(year, month, i)
            });
        }

        // Next month days to fill the grid
        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                day: i,
                isCurrentMonth: false,
                date: new Date(year, month + 1, i)
            });
        }

        return days;
    };

    const days = getDaysInMonth(currentMonth);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Helper to format date as YYYY-MM-DD in local time (NOT UTC)
    const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const isToday = (date) => {
        return date.toDateString() === today.toDateString();
    };

    const isSelected = (date) => {
        return formatLocalDate(date) === selectedDate;
    };

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const handleDateClick = (dayInfo) => {
        const dateStr = formatLocalDate(dayInfo.date);
        onDateSelect(dateStr);
    };

    const goToToday = () => {
        const todayStr = formatLocalDate(new Date());
        onDateSelect(todayStr);
        setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            {/* Calendar Header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-4 py-3">
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="text-center">
                        <span className="font-bold text-xl">
                            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                {dayNames.map((day, idx) => (
                    <div
                        key={day}
                        className={`py-3 text-center text-sm font-bold ${idx === 0 ? 'text-red-500' : 'text-slate-600'}`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-px bg-slate-100 p-1">
                {days.map((dayInfo, idx) => {
                    const isSunday = dayInfo.date.getDay() === 0;
                    return (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handleDateClick(dayInfo)}
                            className={`
                                aspect-square flex items-center justify-center text-base font-medium rounded-lg transition-all
                                ${!dayInfo.isCurrentMonth ? 'text-slate-300 bg-white' : 'bg-white'}
                                ${dayInfo.isCurrentMonth && !isSelected(dayInfo.date) && !isToday(dayInfo.date)
                                    ? isSunday ? 'text-red-500 hover:bg-red-50' : 'text-slate-700 hover:bg-teal-50'
                                    : ''
                                }
                                ${isToday(dayInfo.date) && !isSelected(dayInfo.date)
                                    ? 'ring-2 ring-teal-400 ring-inset bg-teal-50 text-teal-600 font-bold'
                                    : ''
                                }
                                ${isSelected(dayInfo.date)
                                    ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white font-bold shadow-md transform scale-105'
                                    : ''
                                }
                            `}
                        >
                            {dayInfo.day}
                        </button>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="p-3 border-t border-slate-200 flex gap-2">
                <button
                    type="button"
                    onClick={goToToday}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                >
                    Hari Ini
                </button>
                <button
                    type="button"
                    onClick={() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        onDateSelect(formatLocalDate(yesterday));
                        setCurrentMonth(new Date(yesterday.getFullYear(), yesterday.getMonth(), 1));
                    }}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                >
                    Kemarin
                </button>
            </div>
        </div>
    );
};

export default IndonesianMiniCalendar;
