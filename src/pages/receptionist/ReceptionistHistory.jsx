import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ChevronLeft, ChevronRight, AlertCircle, X, FileSpreadsheet, Calendar } from 'lucide-react';
import Barcode from '../../components/ui/Barcode';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDailyReport } from '../../services/reportService';

const ReceptionistHistory = () => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [historyPage, setHistoryPage] = useState(1);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const HISTORY_PER_PAGE = 20;

    const fetchReport = async () => {
        setLoading(true);
        setError(null);

        try {
            // Always fetch daily report
            const data = await getDailyReport(selectedDate);

            // Filter data for current staff only
            const userTickets = data.tickets ? data.tickets.filter(ticket => ticket.created_by_name === user.name) : [];

            // Recalculate stats based on filtered tickets
            const ticketsSold = userTickets.length;
            const ticketsScanned = userTickets.filter(t => t.status === 'USED').length;
            const totalRevenue = userTickets.reduce((sum, t) => sum + parseFloat(t.price || 0), 0);

            // Recalculate categories
            const categoryMap = {};
            userTickets.forEach(t => {
                if (!categoryMap[t.category_name]) {
                    categoryMap[t.category_name] = { _id: t.category_name, count: 0, revenue: 0 };
                }
                categoryMap[t.category_name].count += 1;
                categoryMap[t.category_name].revenue += parseFloat(t.price || 0);
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
            const tickets = reportData.tickets;
            const headers = ['No', 'Ticket ID', t('common.category'), 'NIM', t('common.staff'), t('dashboard.quantity'), `${t('reports.price')} (Rp)`, t('admin.status'), t('common.date'), t('common.time')];
            const rows = tickets.map((ticket, index) => {
                const date = new Date(ticket.created_at);
                return [
                    index + 1,
                    ticket.ticket_code || `TKT-${ticket.id?.substring(0, 8)?.toUpperCase()}`,
                    ticket.category_name,
                    ticket.nim ? `\t${ticket.nim}` : '-', // Force text format for NIM
                    ticket.created_by_name,
                    ticket.quantity || 1,
                    ticket.price,
                    ticket.status === 'USED' ? 'Dipakai' : 'Belum Dipakai',
                    date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US'),
                    date.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US')
                ];
            });

            const totalRevenue = tickets.reduce((sum, t) => sum + parseFloat(t.price || 0), 0);
            rows.push(['', '', '', '', 'TOTAL', tickets.length, totalRevenue, '', '', '']);

            const csvContent = 'sep=;\n' + [headers, ...rows]
                .map(row => row.map(cell => `"${cell || ''}"`).join(';'))
                .join('\n');

            const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            // Modify filename to indicate it's a staff report
            const filename = `staff_report_${user.name.replace(/\s+/g, '_')}_${selectedDate}.csv`;

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
        <div className="space-y-6">
            {/* Top Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Laporan Staff</h1>
                    <p className="text-slate-600 mt-1">Laporan harian penjualan tiket anda</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="space-y-6">
                {/* Chart Section with Stats on Left */}
                {!loading && !error && reportData && (
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Stats Cards - Left Side */}
                        <div className="flex flex-row lg:flex-col gap-4 lg:w-80 flex-shrink-0">
                            <div className="flex-1 bg-white px-5 py-4 rounded-xl border border-blue-100 shadow-sm flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                                        <path d="M3 6h18" />
                                        <path d="M16 10a4 4 0 0 1-8 0" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">{t('reports.sold')}</p>
                                    <p className="text-2xl font-bold text-slate-800">{reportData.tickets_sold || 0}</p>
                                </div>
                            </div>

                            <div className="flex-1 bg-white px-5 py-4 rounded-xl border border-emerald-100 shadow-sm flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14" />
                                        <path d="M12 5l7 7-7 7" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">{t('reports.scanned')}</p>
                                    <p className="text-2xl font-bold text-slate-800">{reportData.tickets_scanned || 0}</p>
                                </div>
                            </div>

                            <div className="flex-1 bg-white px-5 py-4 rounded-xl border border-amber-100 shadow-sm flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                                        <path d="M12 18V6" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">{t('reports.revenue')}</p>
                                    <p className="text-xl font-bold text-slate-800">
                                        Rp {(reportData.total_revenue || 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Chart - Right Side */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex-1">
                            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                                <h4 className="text-xl font-bold text-slate-800">{t('reports.salesByCategory')}</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full">
                                    <span className="w-2.5 h-2.5 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full"></span>
                                    <span className="font-medium">{t('reports.ticketCount')}</span>
                                </div>
                            </div>

                            <div className="relative h-80 flex items-end justify-around gap-8 px-6">
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
                                            'from-blue-400 to-blue-600',
                                            'from-emerald-400 to-emerald-600',
                                            'from-amber-400 to-amber-600',
                                            'from-purple-400 to-purple-600',
                                            'from-rose-400 to-rose-600',
                                            'from-cyan-400 to-cyan-600'
                                        ];

                                        return reportData.by_category.map((cat, idx) => {
                                            const percentage = Math.max(5, (cat.count / maxCount) * 100);
                                            const isHighest = cat.count === maxCount;

                                            return (
                                                <div key={idx} className="flex flex-col items-center group relative flex-1 max-w-[120px] h-full justify-end pb-12">
                                                    {/* Count Label */}
                                                    <div className="mb-3 transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1">
                                                        {isHighest && (
                                                            <div className="flex items-center justify-center gap-1 mb-1.5 text-xs font-bold text-amber-500">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                                </svg>
                                                                <span className="text-[10px] uppercase tracking-wide">{t('reports.highest')}</span>
                                                            </div>
                                                        )}
                                                        <span className={`inline-block text-base font-bold px-3 py-1 rounded-lg shadow-sm border transition-all ${isHighest
                                                            ? 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900 border-amber-300 scale-110'
                                                            : 'bg-white text-slate-700 border-slate-200'
                                                            }`}>
                                                            {cat.count}
                                                        </span>
                                                    </div>

                                                    {/* Bar */}
                                                    <div
                                                        className={`w-full bg-gradient-to-t ${colors[idx % colors.length]} rounded-t-xl transition-all duration-700 relative shadow-lg hover:shadow-xl cursor-pointer transform hover:scale-105 hover:brightness-110`}
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
                                                                    <span className="font-mono font-bold text-emerald-300">
                                                                        Rp {(cat.revenue || 0).toLocaleString()}
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

                {/* Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Button onClick={fetchReport} size="sm" className="bg-slate-900 hover:bg-slate-800">
                            {t('common.refresh')}
                        </Button>
                        {reportData?.tickets?.length > 0 && (
                            <Button onClick={exportToExcel} variant="outline" size="sm">
                                <FileSpreadsheet className="w-4 h-4 mr-1" />
                                {t('reports.exportExcel')}
                            </Button>
                        )}
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
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">No</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">ID</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('common.category')}</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">NIM</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('common.staff')}</th>
                                            <th className="px-4 py-3 text-right font-semibold text-slate-700">{t('reports.price')}</th>
                                            <th className="px-4 py-3 text-center font-semibold text-slate-700">{t('admin.status')}</th>
                                            <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('reports.time')}</th>
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
                                                    <td className="px-4 py-3 font-mono text-xs text-blue-600 font-semibold">
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
                                                    <td className="px-4 py-3 font-medium text-right text-slate-800">
                                                        Rp {parseFloat(ticket.price || 0).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${ticket.status === 'USED'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {ticket.status === 'USED' ? 'Dipakai' : 'Belum Dipakai'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-500 text-xs">
                                                        {date.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
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
            </div>

            {/* Ticket Detail Modal */}
            {selectedTicket && (
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
                            {/* Barcode Section */}
                            <div className="flex justify-center py-4 bg-white border border-slate-200 rounded-xl">
                                <Barcode
                                    value={selectedTicket.ticket_code || selectedTicket.id}
                                    width={1.5}
                                    height={60}
                                    displayValue={false}
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
                                        Rp {parseFloat(selectedTicket.price || 0).toLocaleString()}
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

export default ReceptionistHistory;
