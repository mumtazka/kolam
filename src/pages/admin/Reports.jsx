import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Calendar, Download, Printer } from 'lucide-react';
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Reports</h1>
          <p className="text-slate-600 mt-1">View sales and operational analytics</p>
        </div>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="w-4 h-4 mr-2" />
          Print Report
        </Button>
      </div>

      <Tabs defaultValue="daily" value={reportType} onValueChange={setReportType} className="print:hidden">
        <TabsList className="mb-4">
          <TabsTrigger value="daily">Daily Report</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
          <TabsTrigger value="batch">Batch Audit</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="p-6 print:shadow-none print:border-none">
        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6 print:hidden">
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
        </div>

        {/* Report Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : reportData ? (
          <div className="space-y-8">
            {/* Header for Print */}
            <div className="hidden print:block mb-8 text-center border-b pb-4">
              <h1 className="text-2xl font-bold">KOLAM RENANG UNY - LAPORAN</h1>
              <p className="text-sm text-slate-600">
                {reportType === 'daily' ? `Daily Report: ${selectedDate}` :
                  reportType === 'monthly' ? `Monthly Report: ${selectedMonth}/${selectedYear}` :
                    `Batch Audit: ${selectedDate}`}
              </p>
            </div>

            {reportType === 'batch' ? (
              // Batch Report View
              <div className="space-y-4">
                {reportData.length === 0 ? (
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
            ) : (
              // Daily & Monthly View
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium mb-1">Tickets Sold</p>
                    <p className="text-3xl font-bold text-blue-900">{reportData.tickets_sold}</p>
                  </div>
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-sm text-emerald-600 font-medium mb-1">Tickets Scanned</p>
                    <p className="text-3xl font-bold text-emerald-900">{reportData.tickets_scanned}</p>
                  </div>
                  <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-600 font-medium mb-1">Total Revenue</p>
                    <p className="text-3xl font-bold text-amber-900">Rp {reportData.total_revenue?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Category Breakdown */}
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-4">Sales by Category</h3>
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

                  {/* Shift/Staff Breakdown (Daily Only) */}
                  {reportType === 'daily' && (
                    <div className="space-y-8">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-4">Sales by Shift</h3>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-slate-900">Shift</th>
                                <th className="px-4 py-2 text-right text-sm font-semibold text-slate-900">Count</th>
                                <th className="px-4 py-2 text-right text-sm font-semibold text-slate-900">Revenue</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {reportData.by_shift?.map((shift, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="px-4 py-2 text-sm text-slate-900">{shift.shift}</td>
                                  <td className="px-4 py-2 text-sm text-slate-600 text-right">{shift.count}</td>
                                  <td className="px-4 py-2 text-sm text-slate-900 font-medium text-right">Rp {shift.revenue?.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-4">Sales by Staff</h3>
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
                  )}

                  {/* Daily Trend (Monthly Only) */}
                  {reportType === 'monthly' && (
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900 mb-4">Daily Sales Trend</h3>
                      <div className="border rounded-lg overflow-hidden h-64 overflow-y-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50 border-b border-slate-200">
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
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select filter and click Generate Report</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Reports;