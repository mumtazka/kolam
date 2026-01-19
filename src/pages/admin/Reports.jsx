import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, FileSpreadsheet, ChevronLeft, ChevronRight, AlertCircle, X, RefreshCw, ArrowUpDown, Clock } from 'lucide-react';
import QRCode from '../../components/ui/QRCode';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import { getDailyReport, getMonthlyReport, getYearlyReport, getLifetimeReport } from '../../services/reportService';

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

const Reports = () => {
  const { t, language } = useLanguage();
  const [reportType, setReportType] = useState('daily');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const calendarRef = useRef(null);
  const HISTORY_PER_PAGE = 20;

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendar]);

  // Indonesian Format Helper
  const formatDateIndonesian = (dateStr) => {
    const date = new Date(dateStr);
    const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][date.getDay()];
    const monthName = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][date.getMonth()];
    return `${dayName}, ${date.getDate()} ${monthName} ${date.getFullYear()}`;
  };


  const fetchReport = async () => {
    setLoading(true);
    setError(null);

    try {
      let data;
      if (reportType === 'daily') {
        data = await getDailyReport(selectedDate);
      } else if (reportType === 'monthly') {
        data = await getMonthlyReport(selectedYear, selectedMonth);
      } else if (reportType === 'yearly') {
        data = await getYearlyReport(selectedYear);
      } else if (reportType === 'lifetime') {
        data = await getLifetimeReport();
      }
      setReportData(data);
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
    fetchReport();
  }, [selectedDate, selectedMonth, selectedYear, reportType]);

  const exportToExcel = () => {
    if (!reportData || !reportData.tickets || reportData.tickets.length === 0) {
      toast.error(t('dashboard.noTicketsSelected'));
      return;
    }

    try {
      const tickets = [...reportData.tickets].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const headers = ['No', 'Ticket ID', t('common.category'), 'NIM', t('common.staff'), t('dashboard.quantity'), `${t('reports.price')} (Rp)`, t('admin.status'), t('common.date'), t('common.time')];
      const rows = tickets.map((ticket, index) => {
        const date = new Date(ticket.created_at);
        const quantity = ticket.max_usage && ticket.max_usage > 1 ? ticket.max_usage : (ticket.quantity || 1);
        const unitPrice = parseFloat(ticket.price || 0);
        // If max_usage > 1, the ticket.price is treated as unit price in the UI, so we multiply for total value
        // If it's a standard ticket, ticket.price is the total price.
        // Logic matches the table display logic.
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
          date.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US')
        ];
      });

      const totalRevenue = tickets.reduce((sum, t) => {
        const p = parseFloat(t.price || 0);
        const m = t.max_usage && t.max_usage > 1 ? t.max_usage : 1;
        return sum + (p * m); // Assuming price is unit price for packages, same as rowTotal logic
        // Wait, for standard tickets (m=1), p * 1 = p. Correct.
        // For packages (m=10), p * 10. Correct.
      }, 0);

      const totalQuantity = tickets.reduce((sum, t) => {
        const m = t.max_usage && t.max_usage > 1 ? t.max_usage : (t.quantity || 1);
        return sum + m;
      }, 0);

      rows.push(['', '', '', '', 'TOTAL', totalQuantity, totalRevenue, '', '', '']);

      const csvContent = 'sep=;\n' + [headers, ...rows]
        .map(row => row.map(cell => `"${cell || ''}"`).join(';'))
        .join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      let filename;
      if (reportType === 'daily') {
        filename = `ticket_history_${selectedDate}.csv`;
      } else if (reportType === 'monthly') {
        filename = `ticket_history_${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`;
      } else if (reportType === 'yearly') {
        filename = `ticket_history_${selectedYear}.csv`;
      } else {
        filename = `ticket_history_lifetime.csv`;
      }

      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(t('reports.exportSuccess'));
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Failed to export data');
    }
  };

  const getPaginatedTickets = () => {
    if (!reportData || !reportData.tickets) return [];
    const sortedTickets = [...reportData.tickets].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );
    return sortedTickets.slice(
      (historyPage - 1) * HISTORY_PER_PAGE,
      historyPage * HISTORY_PER_PAGE
    );
  };

  const getTotalPages = () => {
    if (!reportData || !reportData.tickets) return 1;
    return Math.ceil(reportData.tickets.length / HISTORY_PER_PAGE);
  };

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
      {/* Main Content */}
      <div className="space-y-6">
        {/* Chart Section with Stats on Left */}
        {!loading && !error && reportData && reportData.by_category && reportData.by_category.length > 0 && (
          <div className="flex flex-col xl:flex-row gap-8">
            {/* Stats Cards - Left Side */}
            {/* Stats Cards - Left Side */}
            <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-4 xl:w-80 flex-shrink-0">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-[160px] xl:h-[180px] group">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:scale-105 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="xl:w-7 xl:h-7">
                      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                      <path d="M13 5v2" />
                      <path d="M13 17v2" />
                      <path d="M13 11v2" />
                    </svg>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-[10px] xl:text-xs text-teal-600 font-bold uppercase tracking-wider">{t('reports.sold')}</p>
                  </div>
                </div>
                <div>
                  <p className="text-3xl xl:text-4xl font-bold text-slate-900">{reportData.tickets_sold || 0}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-[160px] xl:h-[180px] group">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="xl:w-7 xl:h-7">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-[10px] xl:text-xs text-emerald-600 font-bold uppercase tracking-wider">{t('reports.scanned')}</p>
                  </div>
                </div>
                <div>
                  <p className="text-3xl xl:text-4xl font-bold text-slate-900">{reportData.tickets_scanned || 0}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-[160px] xl:h-[180px] group">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 xl:w-14 xl:h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform">
                    <span className="text-xl xl:text-2xl font-bold">Rp</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-[10px] xl:text-xs text-amber-600 font-bold uppercase tracking-wider">{t('reports.revenue')}</p>
                  </div>
                </div>
                <div>
                  <p className="text-2xl xl:text-3xl font-bold text-slate-900 truncate" title={`Rp ${(reportData.total_revenue || 0).toLocaleString('id-ID')}`}>
                    Rp {(reportData.total_revenue || 0).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </div>

            {/* Chart - Right Side */}
            <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm flex-1">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 pb-6 border-b border-slate-50 gap-4">
                <div>
                  <h4 className="text-2xl font-bold text-slate-900 mb-1">{t('reports.salesByCategory')}</h4>
                  <p className="text-sm text-slate-500">{t('reports.distributionOverview')}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 px-4 py-2 rounded-full">
                  <span className="w-2.5 h-2.5 bg-teal-500 rounded-full shadow-sm"></span>
                  <span>{t('reports.ticketCount')}</span>
                </div>
              </div>

              <div className="w-full overflow-x-auto relative h-96 flex items-end justify-around gap-8 px-6 pb-2">
                {/* Grid Lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-14 pt-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="border-t border-slate-100 w-full"></div>
                  ))}
                </div>

                {/* Y-axis */}
                <div className="absolute left-0 top-0 bottom-14 flex flex-col justify-between text-xs text-slate-400 font-medium pr-4">
                  {(() => {
                    const maxCount = Math.max(...(reportData.by_category.map(c => c.count) || [1]));
                    const step = Math.ceil(maxCount / 5);
                    return [...Array(6)].map((_, i) => (
                      <span key={i} className="text-right">{step * (5 - i)}</span>
                    ));
                  })()}
                </div>

                {/* Bars */}
                <div className="flex items-end justify-around gap-4 xl:gap-12 w-full ml-10 h-full">
                  {(() => {
                    const maxCount = Math.max(...(reportData.by_category.map(c => c.count) || [1]));
                    const colors = [
                      'from-teal-500 to-teal-600 shadow-teal-200',
                      'from-teal-500 to-teal-600 shadow-teal-200',
                      'from-teal-500 to-teal-600 shadow-teal-200',
                      'from-teal-500 to-teal-600 shadow-teal-200',
                      'from-teal-500 to-teal-600 shadow-teal-200',
                      'from-teal-500 to-teal-600 shadow-teal-200'
                    ];

                    return reportData.by_category.map((cat, idx) => {
                      const percentage = Math.max(5, (cat.count / maxCount) * 100);
                      const isHighest = cat.count === maxCount;

                      return (
                        <div key={idx} className="flex flex-col items-center group relative flex-1 max-w-[140px] h-full justify-end pb-14">
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
                            <span className={`inline-block text-lg font-bold px-3 py-1 rounded-lg shadow-sm border transition-all ${isHighest
                              ? 'bg-gradient-to-br from-teal-50 to-teal-100 text-teal-900 border-teal-300 scale-110'
                              : 'bg-white text-slate-700 border-slate-200'
                              }`}>
                              {cat.count}
                            </span>
                          </div>

                          {/* Bar */}
                          <div
                            className={`w-full bg-gradient-to-t ${colors[idx % colors.length]} rounded-t-2xl transition-all duration-700 relative shadow-lg group-hover:shadow-xl cursor-help transform group-hover:brightness-105`}
                            style={{
                              height: `${percentage}%`,
                              minHeight: '40px'
                            }}
                          >
                            {/* Inner Shine */}
                            <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent rounded-t-2xl"></div>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-slate-900/95 backdrop-blur text-white text-xs py-3 px-4 rounded-xl shadow-2xl whitespace-nowrap z-50 pointer-events-none transform translate-y-2 group-hover:translate-y-0">
                              <p className="font-bold mb-2 text-base text-white">{cat._id}</p>
                              <div className="flex flex-col gap-1.5 text-slate-300">
                                <div className="flex justify-between gap-6">
                                  <span>{t('reports.tickets')}:</span>
                                  <span className="font-mono font-bold text-white">{cat.count}</span>
                                </div>
                                <div className="flex justify-between gap-6 pt-1.5 border-t border-slate-700">
                                  <span>{t('reports.revenue')}:</span>
                                  <span className="font-mono font-bold text-emerald-400">
                                    Rp {(cat.revenue || 0).toLocaleString('id-ID')}
                                  </span>
                                </div>
                              </div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-slate-900/95"></div>
                            </div>
                          </div>

                          {/* X-Label */}
                          <div className="absolute bottom-0 left-0 right-0 h-14 flex items-center justify-center pt-2">
                            <span className={`text-xs font-bold text-center leading-snug px-2 transition-colors ${isHighest ? 'text-slate-900' : 'text-slate-500'
                              }`} title={cat._id}>
                              {cat._id}
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

        {/* Controls */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <Tabs value={reportType} onValueChange={setReportType} className="w-full sm:w-auto">
            <TabsList className="bg-slate-100 p-1 rounded-lg w-full sm:w-auto inline-flex whitespace-nowrap overflow-x-auto sm:overflow-visible">
              <TabsTrigger value="daily" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all px-4">{t('reports.dailyReport')}</TabsTrigger>
              <TabsTrigger value="monthly" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all px-4">{t('reports.monthlyReport')}</TabsTrigger>
              <TabsTrigger value="yearly" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all px-4">{t('reports.yearlyReport')}</TabsTrigger>
              <TabsTrigger value="lifetime" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all px-4">{t('reports.lifetimeReport')}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            {reportType === 'daily' && (
              <div className="relative" ref={calendarRef}>
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="flex items-center gap-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-teal-200 rounded-xl px-4 py-2.5 transition-all text-left min-w-[240px] group shadow-sm hover:shadow"
                >
                  <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                    <Calendar className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Tanggal</p>
                    <p className="text-sm font-bold text-slate-700">{formatDateIndonesian(selectedDate)}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-slate-400 ml-auto transition-transform ${showCalendar ? 'rotate-90' : ''}`} />
                </button>

                {showCalendar && (
                  <div className="absolute top-full right-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 w-96">
                    <IndonesianMiniCalendar
                      selectedDate={selectedDate}
                      onDateSelect={(date) => {
                        setSelectedDate(date);
                        setShowCalendar(false);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
            {reportType === 'monthly' && (
              <div className="flex gap-2">
                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger className="w-32 h-10 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger className="w-24 h-10 border-slate-200"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {reportType === 'yearly' && (
              <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger className="w-28 h-10 border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {reportType === 'lifetime' && (
              <span className="text-sm text-slate-500 font-medium px-3 py-2 bg-slate-100 rounded-lg">{t('reports.allData')}</span>
            )}

            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            <Button onClick={fetchReport} size="sm" className="h-10 w-10 p-0 bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </Button>
            {reportData?.tickets?.length > 0 && (
              <Button onClick={exportToExcel} variant="outline" size="sm" className="h-10 px-4 border-slate-200 hover:bg-slate-50 hover:text-teal-700 hover:border-teal-200 rounded-lg transition-all">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('reports.exportExcel')}
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <Card className="rounded-2xl border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white">
              <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 animate-pulse font-medium">{t('common.loading')}</p>
            </div>
          ) : error ? (
            <div className="text-center py-20 bg-white">
              <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t('reports.errorLoading')}</h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">{error}</p>
              <Button onClick={fetchReport} variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                {t('reports.tryAgain')}
              </Button>
            </div>
          ) : reportData && reportData.tickets && reportData.tickets.length > 0 ? (
            <div className="bg-white">
              <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {t('reports.ticketHistory')}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {reportData.tickets.length} {t('reports.totalRecords')}
                  </p>
                </div>
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">No</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">ID</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('common.category')}</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">NIM</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('common.staff')}</th>
                      <th className="px-6 py-4 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">Jumlah</th>
                      <th className="px-6 py-4 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('reports.price')}</th>
                      <th className="px-6 py-4 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('admin.status')}</th>
                      <th className="px-6 py-4 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">{t('reports.time')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {getPaginatedTickets().map((ticket, idx) => {
                      const date = new Date(ticket.created_at);
                      return (
                        <tr
                          key={ticket.id}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <td className="px-6 py-4 text-slate-500 font-medium">
                            {(historyPage - 1) * HISTORY_PER_PAGE + idx + 1}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-mono text-xs text-teal-700 font-bold">
                              {ticket.ticket_code || ticket.id?.substring(0, 8)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-slate-700">{ticket.category_name}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                            {ticket.nim || <span className="text-slate-300">-</span>}
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            {ticket.created_by_name}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {ticket.max_usage && ticket.max_usage > 1 ? (
                              <span className="font-mono text-sm text-slate-700">
                                {ticket.usage_count || 0}/{ticket.max_usage}
                              </span>
                            ) : (
                              <span className="text-slate-400">1</span>
                            )}
                          </td>
                          <td className="px-6 py-4 font-bold text-right text-slate-700">
                            {ticket.max_usage && ticket.max_usage > 1 ? (
                              <>
                                <span>Rp {(parseFloat(ticket.price || 0) * ticket.max_usage).toLocaleString('id-ID')}</span>
                                <span className="text-[10px] text-slate-400 block">({ticket.max_usage} x @{parseFloat(ticket.price || 0).toLocaleString('id-ID')})</span>
                              </>
                            ) : (
                              <>Rp {parseFloat(ticket.price || 0).toLocaleString('id-ID')}</>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
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
                          <td className="px-6 py-4 text-slate-500 text-xs font-medium">
                            {(reportType === 'monthly' || reportType === 'yearly' || reportType === 'lifetime')
                              ? `${date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')} • ${date.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`
                              : date.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-4 md:hidden p-4">
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
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${statusColor}`}>
                          {statusLabel}
                        </span>
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
                          {(reportType === 'monthly' || reportType === 'yearly' || reportType === 'lifetime')
                            ? date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US')
                            : date.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="font-medium">{ticket.created_by_name?.split(' ')[0]}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {getTotalPages() > 1 && (
                <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-xs text-slate-500 font-medium">
                    {t('reports.showing')} <span className="text-slate-900 font-bold">{((historyPage - 1) * HISTORY_PER_PAGE) + 1}</span> {t('reports.to')} <span className="text-slate-900 font-bold">{Math.min(historyPage * HISTORY_PER_PAGE, reportData.tickets.length)}</span> {t('reports.of')} {reportData.tickets.length} {t('reports.entries')}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                      className="h-8 w-8 p-0 border-slate-200 hover:bg-white hover:text-slate-900"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-sm">
                      Page {historyPage} of {getTotalPages()}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage(p => Math.min(getTotalPages(), p + 1))}
                      disabled={historyPage === getTotalPages()}
                      className="h-8 w-8 p-0 border-slate-200 hover:bg-white hover:text-slate-900"
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
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{t('reports.ticketDetails')}</h3>
                <p className="text-sm text-slate-500 mt-1">{t('reports.ticketInfo')}</p>
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
            <div className="p-6 border-t border-slate-100 bg-slate-50">
              <Button
                onClick={() => setSelectedTicket(null)}
                className="w-full bg-slate-900 hover:bg-slate-800"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;