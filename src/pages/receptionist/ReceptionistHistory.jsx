import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ChevronDown, Download, ChevronLeft, ChevronRight, AlertCircle, X, FileSpreadsheet, Calendar, Clock, TrendingUp, ArrowUpDown, RefreshCw, Printer } from 'lucide-react';
import QRCode from '../../components/ui/QRCode';
import { toast } from 'sonner';
import XLSX from 'xlsx-js-style';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDailyReport } from '../../services/reportService';
import TicketPrintTemplate from '../../components/TicketPrintTemplate';
import PrintSettingsModal from '../../components/PrintSettingsModal';

// Indonesian Calendar Component
const IndonesianMiniCalendar = ({ selectedDate, onDateSelect }) => {
    const [currentMonth, setCurrentMonth] = useState(() => {
        const date = new Date(selectedDate);
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
        // Use local date comparison, not UTC
        return formatLocalDate(date) === selectedDate;
    };

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const handleDateClick = (dayInfo) => {
        // Use local date format
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
                        className={`py-3 text-center text-sm font-bold ${idx === 0 ? 'text-red-500' : 'text-slate-600'
                            }`}
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
                    onClick={goToToday}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                >
                    Hari Ini
                </button>
                <button
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

const ReceptionistHistory = () => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Helper to format date as YYYY-MM-DD in local time
    const formatLocalDateMain = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const [selectedDate, setSelectedDate] = useState(formatLocalDateMain(new Date()));
    const [historyPage, setHistoryPage] = useState(1);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [printingTicket, setPrintingTicket] = useState(null);
    const [printingCopies, setPrintingCopies] = useState(1);
    const [showPrintSettings, setShowPrintSettings] = useState(false);
    const [ticketToPrint, setTicketToPrint] = useState(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
    const HISTORY_PER_PAGE = 20;

    // Ref for calendar dropdown to detect outside clicks
    const calendarRef = useRef(null);

    // Close calendar when clicking outside (without blocking page scroll)
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) {
                setShowDatePicker(false);
            }
        };

        if (showDatePicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDatePicker]);

    // Indonesian day names for display
    const dayNamesIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNamesIndo = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    // Format date in Indonesian
    const formatDateIndonesian = (dateStr) => {
        const date = new Date(dateStr);
        const dayName = dayNamesIndo[date.getDay()];
        const day = date.getDate();
        const month = monthNamesIndo[date.getMonth()];
        const year = date.getFullYear();
        return `${dayName}, ${day} ${month} ${year}`;
    };

    // Alias for the redesigned header
    const formatDate = formatDateIndonesian;

    const handleDateSelect = (dateStr) => {
        setSelectedDate(dateStr);
        setShowDatePicker(false);
    };

    const fetchReport = async () => {
        setLoading(true);
        setError(null);

        try {
            // Always fetch daily report
            const data = await getDailyReport(selectedDate);

            // Filter data for current staff only
            const userTickets = data.tickets ? data.tickets.filter(ticket => ticket.created_by_name === user.name) : [];

            // Recalculate stats based on filtered tickets
            // For tickets_sold: count max_usage for package tickets
            const ticketsSold = userTickets.reduce((sum, t) => {
                const multiplier = t.max_usage && t.max_usage > 1 ? t.max_usage : 1;
                return sum + multiplier;
            }, 0);
            // For tickets_scanned: sum usage_count from all tickets
            const ticketsScanned = userTickets.reduce((sum, t) => sum + (t.usage_count || 0), 0);
            // For revenue: multiply price by max_usage for package tickets
            const totalRevenue = userTickets.reduce((sum, t) => {
                const price = parseFloat(t.price || 0);
                const multiplier = t.max_usage && t.max_usage > 1 ? t.max_usage : 1;
                return sum + (isNaN(price) ? 0 : price * multiplier);
            }, 0);

            // Recalculate categories with package-aware logic
            const categoryMap = {};
            userTickets.forEach(t => {
                if (!categoryMap[t.category_name]) {
                    categoryMap[t.category_name] = { _id: t.category_name, count: 0, revenue: 0 };
                }
                const multiplier = t.max_usage && t.max_usage > 1 ? t.max_usage : 1;
                categoryMap[t.category_name].count += multiplier;
                const price = parseFloat(t.price || 0);
                categoryMap[t.category_name].revenue += isNaN(price) ? 0 : price * multiplier;
            });
            const byCategory = Object.values(categoryMap);

            const filteredData = {
                tickets: userTickets,
                tickets_sold: ticketsSold,
                tickets_scanned: ticketsScanned,
                total_revenue: totalRevenue,
                by_category: byCategory
            };

            setReportData(filteredData);
            setHistoryPage(1);
        } catch (error) {
            console.error('Error fetching report:', error);
            setError(error.message || 'Failed to load report');
            toast.error(t('common.error') + ': ' + (error.message || 'Unknown error'));
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.name) {
            fetchReport();
        }
    }, [selectedDate, user?.name]);

    const exportToExcel = () => {
        if (!reportData || !reportData.tickets || reportData.tickets.length === 0) {
            toast.error(t('dashboard.noTicketsSelected'));
            return;
        }

        try {
            // Sort tickets according to current sortOrder before exporting
            const sortedTickets = [...reportData.tickets].sort((a, b) => {
                const dateA = new Date(a.created_at);
                const dateB = new Date(b.created_at);
                return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
            });

            // ========== DATA PREPARATION ==========
            const headers = ['No', 'Ticket ID', t('common.category'), 'NIM', t('common.staff'), t('dashboard.quantity'), `${t('reports.price')} (Rp)`, t('admin.status'), t('common.date'), t('common.time')];

            const ticketRows = sortedTickets.map((ticket, index) => {
                const date = new Date(ticket.created_at);
                const quantity = ticket.max_usage && ticket.max_usage > 1 ? ticket.max_usage : (ticket.quantity || 1);
                const unitPrice = parseFloat(ticket.price || 0);
                const rowTotal = ticket.max_usage && ticket.max_usage > 1 ? (unitPrice * ticket.max_usage) : unitPrice;

                return [
                    index + 1,
                    ticket.ticket_code || `TKT-${ticket.id?.substring(0, 8)?.toUpperCase()}`,
                    ticket.category_name,
                    ticket.nim ? `\t${ticket.nim}` : '-',
                    ticket.created_by_name,
                    quantity,
                    rowTotal,
                    ticket.status === 'USED' ? 'Dipakai' : 'Belum Dipakai',
                    date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US'),
                    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                ];
            });

            // Calculate totals for bottom of left side
            const totalRevenueTicket = sortedTickets.reduce((sum, t) => {
                const p = parseFloat(t.price || 0);
                const m = t.max_usage && t.max_usage > 1 ? t.max_usage : 1;
                return sum + (p * m);
            }, 0);

            const totalQuantityTicket = sortedTickets.reduce((sum, t) => {
                const m = t.max_usage && t.max_usage > 1 ? t.max_usage : (t.quantity || 1);
                return sum + m;
            }, 0);

            ticketRows.push(['', '', '', '', 'TOTAL', totalQuantityTicket, totalRevenueTicket, '', '', '']);


            // ========== SUMMARY PREPARATION (RIGHT SIDE) ==========
            const summaryData = [];

            // Date - always daily for receptionist
            const dateObj = new Date(selectedDate);
            const dayName = dayNamesIndo[dateObj.getDay()];
            const day = String(dateObj.getDate()).padStart(2, '0');
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const year = dateObj.getFullYear();

            // Build Summary Rows [Label, Value, Value2]
            summaryData.push(['Hari / Tanggal', `${dayName} / ${day}-${month}-${year}`, '']);
            // Shift info - current staff name
            summaryData.push(['Shift', user?.name || '-', '']);
            summaryData.push(['', '', '']); // Spacer

            // Dynamic category breakdown
            const categoryStats = {};
            sortedTickets.forEach(ticket => {
                const catName = ticket.category_name || 'Lainnya';
                if (!categoryStats[catName]) {
                    categoryStats[catName] = { count: 0, revenue: 0 };
                }
                const qty = ticket.max_usage && ticket.max_usage > 1 ? ticket.max_usage : 1;
                const price = parseFloat(ticket.price || 0);
                categoryStats[catName].count += qty;
                categoryStats[catName].revenue += price * qty;
            });

            Object.entries(categoryStats).forEach(([catName, stats]) => {
                summaryData.push([catName, stats.count, `Rp ${stats.revenue.toLocaleString('id-ID')}`]);
            });

            summaryData.push(['', '', '']); // Spacer

            // Check-in status breakdown
            let sudahCheckinCount = 0;
            let sudahCheckinRevenue = 0;
            let belumCheckinCount = 0;
            let belumCheckinRevenue = 0;

            sortedTickets.forEach(ticket => {
                const qty = ticket.max_usage && ticket.max_usage > 1 ? ticket.max_usage : 1;
                const usageCount = ticket.usage_count || 0;
                const price = parseFloat(ticket.price || 0);

                if (ticket.max_usage && ticket.max_usage > 1) {
                    const usedQty = Math.min(usageCount, ticket.max_usage);
                    const unusedQty = ticket.max_usage - usedQty;
                    // For packages, we just use unit price for revenue calculation per usage

                    sudahCheckinCount += usedQty;
                    sudahCheckinRevenue += usedQty * price;
                    belumCheckinCount += unusedQty;
                    belumCheckinRevenue += unusedQty * price;
                } else {
                    // Single ticket
                    if (ticket.status === 'USED') {
                        sudahCheckinCount += 1;
                        sudahCheckinRevenue += price * qty;
                    } else {
                        belumCheckinCount += 1;
                        belumCheckinRevenue += price * qty;
                    }
                }
            });

            summaryData.push(['Belum Check-in', belumCheckinCount, `Rp ${belumCheckinRevenue.toLocaleString('id-ID')}`]);
            summaryData.push(['Sudah Check-in', sudahCheckinCount, `Rp ${sudahCheckinRevenue.toLocaleString('id-ID')}`]);

            const grandTotalCount = sudahCheckinCount + belumCheckinCount;
            const grandTotalRevenue = sudahCheckinRevenue + belumCheckinRevenue;
            summaryData.push(['Total', grandTotalCount, `Rp ${grandTotalRevenue.toLocaleString('id-ID')}`]);


            // ========== COMBINE LEFT AND RIGHT ==========
            const finalLines = [];
            const headerLine = [...headers, '', ...['RINGKASAN', '', '']]; // Column K empty, L starts summary
            finalLines.push(headerLine);

            // Determine max rows needed
            const maxRows = Math.max(ticketRows.length, summaryData.length);

            for (let i = 0; i < maxRows; i++) {
                const left = ticketRows[i] || Array(headers.length).fill('');
                const right = summaryData[i] || ['', '', ''];
                finalLines.push([...left, '', ...right]); // Empty string for Column            // Combine summary and data sections
            }

            const ws = XLSX.utils.aoa_to_sheet(finalLines);

            // Auto-fit columns
            const colWidths = finalLines[0].map((_, colIndex) => {
                // Separator column (Gap between data and summary)
                if (colIndex === 10) return { wch: 2 };

                let maxLen = 0;
                finalLines.forEach(row => {
                    const cellValue = row[colIndex] ? String(row[colIndex]) : "";
                    maxLen = Math.max(maxLen, cellValue.length);
                });
                return { wch: maxLen + 2 };
            });
            ws['!cols'] = colWidths;

            // Apply bold styling to summary columns (L, M, N - columns 11, 12, 13)
            const summaryStartCol = 11; // Column L (0-indexed)
            const summaryEndCol = 13; // Column N
            const range = XLSX.utils.decode_range(ws['!ref']);

            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = summaryStartCol; C <= summaryEndCol; ++C) {
                    const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                    if (ws[cellAddress] && ws[cellAddress].v !== '' && ws[cellAddress].v !== undefined) {
                        if (!ws[cellAddress].s) ws[cellAddress].s = {};
                        ws[cellAddress].s.font = { bold: true };
                    }
                }
            }

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Report");

            // Modify filename to indicate it's a staff report
            const filename = `staff_report_${user.name.replace(/\s+/g, '_')}_${selectedDate}.xlsx`;

            XLSX.writeFile(wb, filename);

            toast.success(t('reports.exportSuccess'));
        } catch (err) {
            console.error('Export error:', err);
            toast.error('Failed to export data');
        }
    };

    const handleReprint = (ticket) => {
        // Only show adjust limit for package tickets (> 1 max usage)
        if (ticket.max_usage && ticket.max_usage > 1) {
            setTicketToPrint(ticket);
            setShowPrintSettings(true);
        } else {
            // Direct print for single tickets
            setPrintingTicket(ticket);
            setPrintingCopies(1);
            setTimeout(() => {
                window.print();
                setTimeout(() => {
                    setPrintingTicket(null);
                    setPrintingCopies(1);
                }, 1000);
            }, 500);
        }
    };

    const handleConfirmPrint = (copies) => {
        setShowPrintSettings(false);
        setPrintingTicket(ticketToPrint);
        setPrintingCopies(copies);
        // Wait for render
        setTimeout(() => {
            window.print();
            // Cleanup
            setTimeout(() => {
                setPrintingTicket(null);
                setTicketToPrint(null);
                setPrintingCopies(1);
            }, 1000);
        }, 500);
    };

    const getPaginatedTickets = () => {
        if (!reportData || !reportData.tickets) return [];
        const sortedTickets = [...reportData.tickets].sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
        return sortedTickets.slice(
            (historyPage - 1) * HISTORY_PER_PAGE,
            historyPage * HISTORY_PER_PAGE
        );
    };

    const toggleSortOrder = () => {
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    const getTotalPages = () => {
        if (!reportData || !reportData.tickets) return 1;
        return Math.ceil(reportData.tickets.length / HISTORY_PER_PAGE);
    };

    return (
        <div className="space-y-6 print:hidden">
            {/* Main Content */}
            <div className="space-y-6">
                {/* Chart Section with Stats on Left */}
                {!loading && !error && reportData && (
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Stats Cards - Left Side */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 lg:w-80 flex-shrink-0">
                            <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-[140px] lg:h-[180px] group">
                                <div className="flex justify-between items-start">
                                    <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:scale-105 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 lg:w-7 lg:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                                            <path d="M13 5v2" />
                                            <path d="M13 17v2" />
                                            <path d="M13 11v2" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <p className="text-[10px] lg:text-xs text-teal-600 font-bold uppercase tracking-wider">{t('reports.sold')}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-2xl lg:text-4xl font-bold text-slate-900">{reportData.tickets_sold || 0}</p>
                                </div>
                            </div>

                            <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-[140px] lg:h-[180px] group">
                                <div className="flex justify-between items-start">
                                    <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 lg:w-7 lg:h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                            <circle cx="9" cy="7" r="4" />
                                            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <p className="text-[10px] lg:text-xs text-emerald-600 font-bold uppercase tracking-wider">{t('reports.scanned')}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-2xl lg:text-4xl font-bold text-slate-900">{reportData.tickets_scanned || 0}</p>
                                </div>
                            </div>

                            <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-[140px] lg:h-[180px] group">
                                <div className="flex justify-between items-start">
                                    <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                                        <span className="text-lg lg:text-2xl font-bold">Rp</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <p className="text-[10px] lg:text-xs text-amber-600 font-bold uppercase tracking-wider">{t('reports.revenue')}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xl lg:text-3xl font-bold text-slate-900 truncate" title={`Rp ${(reportData.total_revenue || 0).toLocaleString('id-ID')}`}>
                                        Rp {(reportData.total_revenue || 0).toLocaleString('id-ID')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Chart - Right Side */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex-1">
                            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                                <h4 className="text-xl font-bold text-slate-800">{t('reports.salesByCategory')}</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full">
                                    <span className="w-2.5 h-2.5 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full"></span>
                                    <span className="font-medium">{t('reports.ticketCount')}</span>
                                </div>
                            </div>

                            <div className="w-full overflow-x-auto relative h-80 flex items-end justify-around gap-8 px-6 pb-2">
                                {/* Grid Lines */}
                                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-12 pt-4">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="border-t border-slate-200/60 w-full"></div>
                                    ))}
                                </div>

                                {/* Y-axis */}
                                <div className="absolute left-0 top-0 bottom-12 flex flex-col justify-between text-xs text-slate-500 font-medium pr-2">
                                    {(() => {
                                        const maxCount = Math.max(...(reportData.by_category.map(c => c.count) || [1]));
                                        const step = Math.ceil(maxCount / 5);
                                        return [...Array(6)].map((_, i) => (
                                            <span key={i} className="text-right">{step * (5 - i)}</span>
                                        ));
                                    })()}
                                </div>

                                {/* Bars */}
                                <div className="flex items-end justify-around gap-6 w-full ml-8 h-full">
                                    {(() => {
                                        if (!reportData.by_category || reportData.by_category.length === 0) {
                                            return <div className="w-full h-full flex items-center justify-center text-slate-400">{t('reports.noData')}</div>;
                                        }
                                        const maxCount = Math.max(...(reportData.by_category.map(c => c.count) || [1]));
                                        const colors = [
                                            'from-teal-400 to-teal-600',
                                            'from-teal-400 to-teal-600',
                                            'from-teal-400 to-teal-600',
                                            'from-teal-400 to-teal-600',
                                            'from-teal-400 to-teal-600',
                                            'from-teal-400 to-teal-600'
                                        ];

                                        return reportData.by_category.map((cat, idx) => {
                                            const percentage = Math.max(5, (cat.count / maxCount) * 100);
                                            const isHighest = cat.count === maxCount;

                                            return (
                                                <div key={idx} className="flex flex-col items-center group relative flex-1 max-w-[120px] h-full justify-end pb-12">
                                                    {/* Count Label */}
                                                    <div className="mb-3 transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1 flex flex-col items-center">
                                                        {isHighest && (
                                                            <div className="flex items-center justify-center gap-1 mb-1.5 text-xs font-bold text-teal-500">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                                </svg>
                                                                <span className="text-[10px] uppercase tracking-wide">{t('reports.highest')}</span>
                                                            </div>
                                                        )}
                                                        <span className={`inline-block text-base font-bold px-3 py-1 rounded-lg shadow-sm border transition-all ${isHighest
                                                            ? 'bg-gradient-to-br from-teal-50 to-teal-100 text-teal-900 border-teal-300 scale-110'
                                                            : 'bg-white text-slate-700 border-slate-200'
                                                            }`}>
                                                            {cat.count}
                                                        </span>
                                                    </div>

                                                    {/* Bar */}
                                                    <div
                                                        className={`w-full bg-gradient-to-t ${colors[idx % colors.length]} rounded-t-xl transition-all duration-700 relative shadow-lg hover:shadow-xl cursor-pointer transform hover:brightness-110`}
                                                        style={{
                                                            height: `${percentage}%`,
                                                            minHeight: '40px'
                                                        }}
                                                    >
                                                        {/* Tooltip */}
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-slate-900 text-white text-xs py-3 px-4 rounded-xl shadow-2xl whitespace-nowrap z-50 pointer-events-none">
                                                            <p className="font-bold mb-1.5 text-yellow-300 text-sm">{cat._id}</p>
                                                            <div className="flex flex-col gap-1.5 text-slate-200">
                                                                <div className="flex justify-between gap-4">
                                                                    <span className="text-slate-400">{t('reports.tickets')}:</span>
                                                                    <span className="font-mono font-bold">{cat.count}</span>
                                                                </div>
                                                                <div className="flex justify-between gap-4 pt-1 border-t border-slate-700">
                                                                    <span className="text-slate-400">{t('reports.revenue')}:</span>
                                                                    <span className="font-mono font-bold text-teal-300">
                                                                        Rp {(cat.revenue || 0).toLocaleString('id-ID')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900"></div>
                                                        </div>

                                                        {/* Shine Effect */}
                                                        <div className="absolute inset-0 rounded-t-xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                    </div>

                                                    {/* X-Label */}
                                                    <div className="absolute bottom-0 left-0 right-0 h-12 flex items-center justify-center">
                                                        <span className={`text-xs font-bold text-center leading-tight px-2 transition-colors ${isHighest ? 'text-slate-900' : 'text-slate-600'
                                                            }`} title={cat._id}>
                                                            {cat._id.length > 12 ? cat._id.substring(0, 10) + '...' : cat._id}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Controls - Redesigned to match Reports UI */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                    {/* Date Picker - Left Side */}
                    <div className="relative w-full sm:w-auto">
                        <button
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className="flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-teal-200 rounded-xl px-4 py-2.5 transition-all text-left min-w-[240px] group shadow-sm hover:shadow"
                        >
                            <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                                <Calendar className="w-4 h-4 text-teal-600" />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t('reports.date')}</p>
                                <p className="text-sm font-bold text-slate-700">{formatDate(selectedDate)}</p>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Date Picker Dropdown */}
                        {showDatePicker && (
                            <div className="absolute top-full left-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="fixed inset-0 bg-transparent" onClick={() => setShowDatePicker(false)} />
                                <div className="relative w-80 bg-white rounded-xl shadow-xl border border-teal-100 overflow-hidden">
                                    <IndonesianMiniCalendar
                                        selectedDate={selectedDate}
                                        onDateSelect={handleDateSelect}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                        {/* Separator */}
                        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                        {/* Refresh Button */}
                        <Button onClick={fetchReport} size="sm" className="h-10 w-10 p-0 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center">
                            <RefreshCw className="w-5 h-5" />
                        </Button>

                        {/* Sort Button */}
                        <button
                            onClick={toggleSortOrder}
                            className="flex items-center gap-2 h-10 px-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg transition-all text-slate-600 font-medium text-sm"
                            title={t('reports.sort')}
                        >
                            {sortOrder === 'desc' ? <ArrowUpDown className="w-4 h-4" /> : <ArrowUpDown className="w-4 h-4" />}
                            <span className="hidden sm:inline">{sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}</span>
                        </button>

                        {/* Export Button */}
                        <Button
                            onClick={exportToExcel}
                            variant="outline"
                            size="sm"
                            className="h-10 px-4 border-slate-200 hover:bg-slate-50 hover:text-teal-700 hover:border-teal-200 rounded-lg transition-all"
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-2" />
                            {t('reports.exportExcel')}
                        </Button>
                    </div>
                </div>


                {/* Table */}
                <Card className="p-6 rounded-xl shadow-sm border-slate-200">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : error ? (
                        <div className="text-center py-16">
                            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-red-500" />
                            </div>
                            <p className="text-sm font-medium text-red-600">{error}</p>
                            <Button onClick={fetchReport} variant="outline" size="sm" className="mt-4">
                                {t('common.back')}
                            </Button>
                        </div>
                    ) : reportData && reportData.tickets && reportData.tickets.length > 0 ? (
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">
                                {t('reports.ticketHistory')} ({reportData.tickets.length})
                            </h3>
                            <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-sm min-w-[800px]">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">No</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">ID</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('common.category')}</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">NIM</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('common.staff')}</th>
                                            <th className="px-4 py-3 text-center font-semibold text-slate-700">Jumlah</th>
                                            <th className="px-4 py-3 text-right font-semibold text-slate-700">{t('reports.price')}</th>
                                            <th className="px-4 py-3 text-center font-semibold text-slate-700">{t('admin.status')}</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('reports.time')}</th>
                                            <th className="px-4 py-3 text-center font-semibold text-slate-700">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {getPaginatedTickets().map((ticket, idx) => {
                                            const date = new Date(ticket.created_at);
                                            return (
                                                <tr
                                                    key={ticket.id}
                                                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                                                    onClick={() => setSelectedTicket(ticket)}
                                                >
                                                    <td className="px-4 py-3 text-slate-600">
                                                        {(historyPage - 1) * HISTORY_PER_PAGE + idx + 1}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs text-teal-700 font-semibold">
                                                        {ticket.ticket_code || ticket.id?.substring(0, 8)}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-slate-800">
                                                        {ticket.category_name}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                                                        {ticket.nim || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">
                                                        {ticket.created_by_name}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {ticket.max_usage && ticket.max_usage > 1 ? (
                                                            <span className="font-mono text-sm text-slate-700">
                                                                {ticket.usage_count || 0}/{ticket.max_usage}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">1</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-right text-slate-800">
                                                        {ticket.max_usage && ticket.max_usage > 1 ? (
                                                            <>
                                                                <span>Rp {(parseFloat(ticket.price || 0) * ticket.max_usage).toLocaleString('id-ID')}</span>
                                                                <span className="text-[10px] text-slate-400 block">({ticket.max_usage} x @{parseFloat(ticket.price || 0).toLocaleString('id-ID')})</span>
                                                            </>
                                                        ) : (
                                                            <>Rp {parseFloat(ticket.price || 0).toLocaleString('id-ID')}</>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        {ticket.max_usage && ticket.max_usage > 1 ? (
                                                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${(ticket.usage_count || 0) >= ticket.max_usage
                                                                ? 'bg-teal-100 text-teal-800'
                                                                : (ticket.usage_count || 0) > 0
                                                                    ? 'bg-amber-100 text-amber-800'
                                                                    : 'bg-slate-100 text-slate-600'
                                                                }`}>
                                                                {(ticket.usage_count || 0) >= ticket.max_usage ? 'Dipakai' : (ticket.usage_count || 0) > 0 ? 'Sebagian' : 'Belum Digunakan'}
                                                            </span>
                                                        ) : (
                                                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${ticket.status === 'USED'
                                                                ? 'bg-teal-100 text-teal-800'
                                                                : 'bg-slate-100 text-slate-600'
                                                                }`}>
                                                                {ticket.status === 'USED' ? 'Dipakai' : 'Belum Digunakan'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500 text-xs">
                                                        {date.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleReprint(ticket);
                                                            }}
                                                            title="Cetak Lagi"
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="grid grid-cols-1 gap-4 md:hidden">
                                {getPaginatedTickets().map((ticket, idx) => {
                                    const date = new Date(ticket.created_at);
                                    const isPackage = ticket.max_usage && ticket.max_usage > 1;
                                    const status = isPackage
                                        ? ((ticket.usage_count || 0) >= ticket.max_usage ? 'used' : (ticket.usage_count || 0) > 0 ? 'partial' : 'unused')
                                        : (ticket.status === 'USED' ? 'used' : 'unused');

                                    const statusLabel = isPackage
                                        ? ((ticket.usage_count || 0) >= ticket.max_usage ? 'Dipakai' : (ticket.usage_count || 0) > 0 ? 'Sebagian' : 'Belum Digunakan')
                                        : (ticket.status === 'USED' ? 'Dipakai' : 'Belum Digunakan');

                                    const statusColor = status === 'used'
                                        ? 'bg-teal-100 text-teal-800'
                                        : status === 'partial'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-slate-100 text-slate-600';

                                    return (
                                        <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm active:scale-95 transition-transform">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <span className="font-mono text-xs text-teal-700 font-bold block mb-1">
                                                        {ticket.ticket_code || ticket.id?.substring(0, 8)}
                                                    </span>
                                                    <div className="font-bold text-slate-900 line-clamp-1">{ticket.category_name}</div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${statusColor}`}>
                                                        {statusLabel}
                                                    </span>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 px-2 text-xs border-teal-200 text-teal-700 hover:bg-teal-50"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleReprint(ticket);
                                                        }}
                                                    >
                                                        <Printer className="w-3 h-3 mr-1" />
                                                        Cetak
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                                <div className="bg-slate-50 p-2 rounded-lg">
                                                    <div className="text-xs text-slate-500 mb-1">{t('reports.price')}</div>
                                                    <div className="font-bold text-slate-800">
                                                        {isPackage ? (
                                                            <>
                                                                Rp {(parseFloat(ticket.price || 0) * ticket.max_usage).toLocaleString('id-ID')}
                                                            </>
                                                        ) : (
                                                            <>Rp {parseFloat(ticket.price || 0).toLocaleString('id-ID')}</>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 p-2 rounded-lg">
                                                    <div className="text-xs text-slate-500 mb-1">Jumlah</div>
                                                    <div className="font-bold text-slate-800">
                                                        {isPackage ? `${ticket.usage_count || 0}/${ticket.max_usage}` : '1'}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-100">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {date.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="font-medium text-slate-400">Idx: {(historyPage - 1) * HISTORY_PER_PAGE + idx + 1}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {getTotalPages() > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-xs text-slate-500">
                                        {((historyPage - 1) * HISTORY_PER_PAGE) + 1} - {Math.min(historyPage * HISTORY_PER_PAGE, reportData.tickets.length)} of {reportData.tickets.length}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                                            disabled={historyPage === 1}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <span className="text-xs font-medium text-slate-700">
                                            {historyPage} / {getTotalPages()}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setHistoryPage(p => Math.min(getTotalPages(), p + 1))}
                                            disabled={historyPage === getTotalPages()}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-slate-500">
                            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calendar className="w-8 h-8 text-slate-400" />
                            </div>
                            <p className="text-sm font-medium">{t('reports.noData')}</p>
                        </div>
                    )}
                </Card>
            </div >

            {/* Ticket Detail Modal */}
            {
                selectedTicket && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Detail Tiket</h3>
                                    <p className="text-sm text-slate-500 mt-1">Informasi lengkap tiket</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 space-y-6">
                                {/* QR Code Section */}
                                <div className="flex justify-center py-4 bg-white border border-slate-200 rounded-xl">
                                    <QRCode
                                        value={selectedTicket.ticket_code || selectedTicket.id}
                                        size={120}
                                    />
                                </div>

                                {/* Ticket Code */}
                                <div className="text-center">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Kode Tiket</p>
                                    <p className="text-2xl font-bold font-mono text-slate-900 mt-1">
                                        {selectedTicket.ticket_code || selectedTicket.id?.substring(0, 8)}
                                    </p>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-xl">
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Kategori</p>
                                        <p className="text-sm font-bold text-slate-800 mt-1">{selectedTicket.category_name}</p>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl">
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Harga</p>
                                        <p className="text-sm font-bold text-slate-800 mt-1">
                                            Rp {parseFloat(selectedTicket.price || 0).toLocaleString('id-ID')}
                                        </p>
                                    </div>

                                    {selectedTicket.nim && (
                                        <div className="bg-blue-50 p-4 rounded-xl">
                                            <p className="text-xs text-blue-500 font-medium uppercase tracking-wider">NIM</p>
                                            <p className="text-sm font-bold text-blue-800 font-mono mt-1">{selectedTicket.nim}</p>
                                        </div>
                                    )}

                                    <div className="bg-slate-50 p-4 rounded-xl">
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Petugas</p>
                                        <p className="text-sm font-bold text-slate-800 mt-1">{selectedTicket.created_by_name}</p>
                                    </div>

                                    <div className={`p-4 rounded-xl ${selectedTicket.status === 'USED' ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                                        <p className={`text-xs font-medium uppercase tracking-wider ${selectedTicket.status === 'USED' ? 'text-emerald-500' : 'text-slate-500'}`}>Status</p>
                                        <p className={`text-sm font-bold mt-1 ${selectedTicket.status === 'USED' ? 'text-emerald-800' : 'text-slate-800'}`}>
                                            {selectedTicket.status === 'USED' ? 'Sudah Digunakan' : 'Belum Digunakan'}
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl col-span-2">
                                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Waktu Pembuatan</p>
                                        <p className="text-sm font-bold text-slate-800 mt-1">
                                            {new Date(selectedTicket.created_at).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                            {' - '}
                                            {new Date(selectedTicket.created_at).toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-3">
                                <Button
                                    onClick={() => setSelectedTicket(null)}
                                    className="w-full sm:flex-1 bg-slate-900 hover:bg-slate-800"
                                >
                                    Tutup
                                </Button>
                                <Button
                                    onClick={() => handleReprint(selectedTicket)}
                                    className="w-full sm:flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Cetak Lagi
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Print Settings Modal */}
            <PrintSettingsModal
                isOpen={showPrintSettings}
                onClose={() => setShowPrintSettings(false)}
                onPrint={handleConfirmPrint}
                ticket={ticketToPrint}
            />

            {/* Hidden Print Template */}
            {printingTicket && (
                <div className="hidden print:flex fixed inset-0 items-center justify-center bg-white z-[9999]">
                    <TicketPrintTemplate ticket={printingTicket} copies={printingCopies} language={language} />
                </div>
            )}
        </div>
    );
};

export default ReceptionistHistory;
