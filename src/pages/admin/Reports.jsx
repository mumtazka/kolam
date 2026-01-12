import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Calendar, Download, FileSpreadsheet, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

// Import Supabase service
import { getDailyReport, getMonthlyReport, getBatchReport } from '../../services/reportService';

const Reports = () => {
  const [reportType, setReportType] = useState('daily');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PER_PAGE = 20;

  const fetchReport = async () => {
    setLoading(true);
    try {
      let data;
      if (reportType === 'daily') {
        data = await getDailyReport(selectedDate);
      } else if (reportType === 'monthly') {
        data = await getMonthlyReport(selectedYear, selectedMonth);
      } else if (reportType === 'batch') {
        data = await getBatchReport(selectedDate);
      }
      setReportData(data);
      setHistoryPage(1);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedDate, selectedMonth, selectedYear, reportType]);

  // Export to Excel function
  const exportToExcel = () => {
    if (!reportData || !reportData.tickets || reportData.tickets.length === 0) {
      toast.error('No ticket data to export');
      return;
    }

    const tickets = reportData.tickets;

    // Create CSV content
    const headers = ['No', 'Ticket ID', 'Category', 'Staff', 'Quantity', 'Price (Rp)', 'Status', 'Date', 'Time'];
    const rows = tickets.map((ticket, index) => {
      const date = new Date(ticket.created_at);
      return [
        index + 1,
        ticket.id,
        ticket.category_name,
        ticket.created_by_name,
        ticket.quantity || 1,
        ticket.price,
        ticket.status,
        date.toLocaleDateString('id-ID'),
        date.toLocaleTimeString('id-ID')
      ];
    });

    // Add total row
    const totalRevenue = tickets.reduce((sum, t) => sum + parseFloat(t.price), 0);
    const totalQuantity = tickets.reduce((sum, t) => sum + (t.quantity || 1), 0);
    rows.push(['', '', '', 'TOTAL', totalQuantity, totalRevenue, '', '', '']);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const filename = reportType === 'daily'
      ? `ticket_history_${selectedDate}.csv`
      : `ticket_history_${selectedYear}-${String(selectedMonth).padStart(2, '0')}.csv`;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Excel file downloaded successfully!');
  };

  // Get paginated tickets for history view
  const getPaginatedTickets = () => {
    if (!reportData || !reportData.tickets) return [];
    const start = (historyPage - 1) * HISTORY_PER_PAGE;
    const end = start + HISTORY_PER_PAGE;
    return reportData.tickets.slice(start, end);
  };

  const getTotalPages = () => {
    if (!reportData || !reportData.tickets) return 1;
    return Math.ceil(reportData.tickets.length / HISTORY_PER_PAGE);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Reports</h1>
          <p className="text-slate-600 mt-1">View sales and operational analytics</p>
        </div>
        {/* Summary Stats - Moved to header area */}
        {reportData && reportType !== 'batch' && (
          <div className="flex items-center space-x-4">
            <div className="text-right px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-600 font-medium">Sold</p>
              <p className="text-lg font-bold text-blue-900">{reportData.tickets_sold}</p>
            </div>
            <div className="text-right px-4 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
              <p className="text-xs text-emerald-600 font-medium">Scanned</p>
              <p className="text-lg font-bold text-emerald-900">{reportData.tickets_scanned}</p>
            </div>
            <div className="text-right px-4 py-2 bg-amber-50 rounded-lg border border-amber-100">
              <p className="text-xs text-amber-600 font-medium">Revenue</p>
              <p className="text-lg font-bold text-amber-900">Rp {reportData.total_revenue?.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue="daily" value={reportType} onValueChange={setReportType}>
        <TabsList className="mb-4">
          <TabsTrigger value="daily">Daily Report</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
          <TabsTrigger value="batch">Batch Audit</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="p-6">
        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          {reportType === 'daily' || reportType === 'batch' ? (
            <div className="flex-1 max-w-xs">
              <label className="text-sm font-medium text-slate-700 mb-2 block">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>
          ) : (
            <div className="flex space-x-4">
              <div className="w-32">
                <label className="text-sm font-medium text-slate-700 mb-2 block">Month</label>
                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <label className="text-sm font-medium text-slate-700 mb-2 block">Year</label>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map(y => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <Button onClick={fetchReport} className="bg-slate-900 hover:bg-slate-800 mt-7">
            Refresh
          </Button>
          {reportType !== 'batch' && reportData && reportData.tickets && reportData.tickets.length > 0 && (
            <Button onClick={exportToExcel} variant="outline" className="mt-7">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export Excel
            </Button>
          )}
        </div>

        {/* Report Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : reportData ? (
          <div className="space-y-8">
            {reportType === 'batch' ? (
              // Batch Report View
              <div className="space-y-4">
                {!Array.isArray(reportData) || reportData.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">No batches found for this date.</p>
                ) : (
                  reportData.map(batch => (
                    <div key={batch.batch_id} className="border rounded-lg p-4 hover:bg-slate-50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">Batch ID: <span className="font-mono text-xs">{batch.batch_id}</span></p>
                          <p className="text-sm text-slate-600">Created by: {batch.created_by_name} | Shift: {batch.shift}</p>
                          <p className="text-xs text-slate-400">{new Date(batch.created_at).toLocaleTimeString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">Rp {batch.total_revenue.toLocaleString()}</p>
                          <p className="text-sm text-emerald-600">{batch.total_tickets} Tickets</p>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap gap-2">
                        {batch.tickets.map(t => (
                          <span key={t.id} className={`px-2 py-1 rounded ${t.status === 'USED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100'}`}>
                            {t.category_name} {t.status === 'USED' ? '(Scanned)' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : reportType === 'daily' ? (
              // Daily View - Ticket History with Category & Staff tables
              <div className="space-y-6">
                {/* Sales by Category and Staff side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Category Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Sales by Category</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Category</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold text-slate-900">Count</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold text-slate-900">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {reportData.by_category?.map((cat, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-sm text-slate-900">{cat._id}</td>
                              <td className="px-4 py-2 text-sm text-slate-600 text-right">{cat.count}</td>
                              <td className="px-4 py-2 text-sm text-slate-900 font-medium text-right">Rp {cat.revenue?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Staff Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Sales by Staff</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Staff</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold text-slate-900">Count</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold text-slate-900">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {reportData.by_staff?.map((staff, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-sm text-slate-900">{staff.staff_name}</td>
                              <td className="px-4 py-2 text-sm text-slate-600 text-right">{staff.count}</td>
                              <td className="px-4 py-2 text-sm text-slate-900 font-medium text-right">Rp {staff.revenue?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Ticket History Table */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Ticket History ({reportData.tickets?.length || 0})</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">No</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Ticket ID</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Category</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Staff</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Qty</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Price</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {getPaginatedTickets().map((ticket, idx) => {
                          const date = new Date(ticket.created_at);
                          return (
                            <tr key={ticket.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm text-slate-600">{(historyPage - 1) * HISTORY_PER_PAGE + idx + 1}</td>
                              <td className="px-4 py-3 text-sm text-slate-900 font-mono text-xs">{ticket.id?.substring(0, 8)}...</td>
                              <td className="px-4 py-3 text-sm text-slate-900">{ticket.category_name}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{ticket.created_by_name}</td>
                              <td className="px-4 py-3 text-sm text-slate-600 text-right">{ticket.quantity || 1}</td>
                              <td className="px-4 py-3 text-sm text-slate-900 font-medium text-right">Rp {parseFloat(ticket.price).toLocaleString()}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${ticket.status === 'USED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                  {ticket.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
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
                      <p className="text-sm text-slate-600">
                        Showing {((historyPage - 1) * HISTORY_PER_PAGE) + 1} - {Math.min(historyPage * HISTORY_PER_PAGE, reportData.tickets?.length || 0)} of {reportData.tickets?.length || 0}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                          disabled={historyPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-slate-600">
                          Page {historyPage} of {getTotalPages()}
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
              </div>
            ) : (
              // Monthly View - Category, Daily Trend, and Ticket History
              <div className="space-y-6">
                {/* Sales by Category and Daily Trend side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Category Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Sales by Category</h3>
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Category</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold text-slate-900">Count</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold text-slate-900">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {reportData.by_category?.map((cat, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-sm text-slate-900">{cat._id}</td>
                              <td className="px-4 py-2 text-sm text-slate-600 text-right">{cat.count}</td>
                              <td className="px-4 py-2 text-sm text-slate-900 font-medium text-right">Rp {cat.revenue?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Daily Trend */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Daily Sales Trend</h3>
                    <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Date</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold text-slate-900">Count</th>
                            <th className="px-4 py-2 text-right text-sm font-semibold text-slate-900">Revenue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {reportData.by_day?.map((day, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-sm text-slate-900">{day.date}</td>
                              <td className="px-4 py-2 text-sm text-slate-600 text-right">{day.count}</td>
                              <td className="px-4 py-2 text-sm text-slate-900 font-medium text-right">Rp {day.revenue?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Ticket History Table */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Ticket History ({reportData.tickets?.length || 0})</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">No</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Ticket ID</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Category</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Staff</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Qty</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-900">Price</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-slate-900">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">Date & Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {getPaginatedTickets().map((ticket, idx) => {
                          const date = new Date(ticket.created_at);
                          return (
                            <tr key={ticket.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm text-slate-600">{(historyPage - 1) * HISTORY_PER_PAGE + idx + 1}</td>
                              <td className="px-4 py-3 text-sm text-slate-900 font-mono text-xs">{ticket.id?.substring(0, 8)}...</td>
                              <td className="px-4 py-3 text-sm text-slate-900">{ticket.category_name}</td>
                              <td className="px-4 py-3 text-sm text-slate-600">{ticket.created_by_name}</td>
                              <td className="px-4 py-3 text-sm text-slate-600 text-right">{ticket.quantity || 1}</td>
                              <td className="px-4 py-3 text-sm text-slate-900 font-medium text-right">Rp {parseFloat(ticket.price).toLocaleString()}</td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${ticket.status === 'USED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                  {ticket.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">
                                {date.toLocaleDateString('id-ID')} {date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
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
                      <p className="text-sm text-slate-600">
                        Showing {((historyPage - 1) * HISTORY_PER_PAGE) + 1} - {Math.min(historyPage * HISTORY_PER_PAGE, reportData.tickets?.length || 0)} of {reportData.tickets?.length || 0}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                          disabled={historyPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-slate-600">
                          Page {historyPage} of {getTotalPages()}
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
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select filter and click Refresh</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Reports;