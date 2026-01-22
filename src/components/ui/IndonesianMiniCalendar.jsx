import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const IndonesianMiniCalendar = ({ selectedDate, onDateSelect, minDate, className }) => {
    // Helper to ensure we have a Date object
    const toDate = (d) => {
        if (!d) return new Date();
        if (d instanceof Date) return d;
        // Handle string date "YYYY-MM-DD"
        return new Date(d);
    };

    // Helper to format date as YYYY-MM-DD in local time (NOT UTC)
    const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [currentMonth, setCurrentMonth] = useState(() => {
        const d = selectedDate ? toDate(selectedDate) : new Date();
        return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    // Update current month if selectedDate changes externally
    useEffect(() => {
        if (selectedDate) {
            const d = toDate(selectedDate);
            // Optional: Jump to the month of the new selected date?
            // For smoother UX, we might only want to do this on initial load
            // But if the user selects a date via other means, the calendar should probably show it.
            // setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
        }
    }, [selectedDate]);

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

    const isToday = (date) => {
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const isSelected = (date) => {
        if (!selectedDate) return false;
        const s = toDate(selectedDate);
        return date.getDate() === s.getDate() &&
            date.getMonth() === s.getMonth() &&
            date.getFullYear() === s.getFullYear();
    };

    const isDisabled = (date) => {
        if (!minDate) return false;
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        const minDateCheck = toDate(minDate);
        minDateCheck.setHours(0, 0, 0, 0);

        return checkDate < minDateCheck;
    };

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const handleDateClick = (dayInfo) => {
        if (isDisabled(dayInfo.date)) return;

        const dateStr = formatLocalDate(dayInfo.date);
        if (onDateSelect) {
            onDateSelect(dateStr);
        }
    };

    const goToToday = () => {
        const now = new Date();
        if (isDisabled(now)) return;

        const dateStr = formatLocalDate(now);
        if (onDateSelect) {
            onDateSelect(dateStr);
        }
        setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    };

    const goToYesterday = () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (isDisabled(yesterday)) return;

        const dateStr = formatLocalDate(yesterday);
        if (onDateSelect) {
            onDateSelect(dateStr);
        }
        setCurrentMonth(new Date(yesterday.getFullYear(), yesterday.getMonth(), 1));
    };

    return (
        <div className={`bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden w-[320px] ${className || ''}`}>
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
                    const disabled = isDisabled(dayInfo.date);
                    const selected = isSelected(dayInfo.date);
                    const today = isToday(dayInfo.date);
                    const currentMonth = dayInfo.isCurrentMonth;

                    return (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => handleDateClick(dayInfo)}
                            disabled={disabled}
                            className={`
                                aspect-square flex items-center justify-center text-base font-medium rounded-lg transition-all
                                ${disabled
                                    ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                                    : !currentMonth
                                        ? 'text-slate-300 bg-white'
                                        : 'bg-white'
                                }
                                ${!disabled && currentMonth && !selected && !today
                                    ? isSunday ? 'text-red-500 hover:bg-red-50' : 'text-slate-700 hover:bg-teal-50'
                                    : ''
                                }
                                ${!disabled && today && !selected
                                    ? 'ring-2 ring-teal-400 ring-inset bg-teal-50 text-teal-600 font-bold'
                                    : ''
                                }
                                ${!disabled && selected
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
                    disabled={isDisabled(new Date())}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Hari Ini
                </button>
                <button
                    type="button"
                    onClick={goToYesterday}
                    disabled={(() => {
                        const y = new Date();
                        y.setDate(y.getDate() - 1);
                        return isDisabled(y);
                    })()}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Kemarin
                </button>
            </div>
        </div>
    );
};

export default IndonesianMiniCalendar;
