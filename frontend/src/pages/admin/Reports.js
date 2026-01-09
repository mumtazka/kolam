import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Calendar } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Reports = () => {
  const [reportType, setReportType] = useState('daily');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = `${API}/reports/daily?date=${selectedDate}`;
      const response = await axios.get(url);
      setReportData(response.data);
    } catch (error) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900" style={{fontFamily: 'Outfit'}}>Reports</h1>
        <p className="text-slate-600 mt-1">View sales and operational reports</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700 mb-2 block">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full h-10 px-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              data-testid="report-date-picker"
            />
          </div>
          <Button onClick={fetchReport} className="bg-slate-900 hover:bg-slate-800 mt-7" data-testid="generate-report-button">
            Generate Report
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : reportData ? (
          <div className="space-y-6">
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

            {reportData.by_category && reportData.by_category.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-slate-900 mb-4">Sales by Category</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-slate-900">Category</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Tickets</th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-slate-900">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportData.by_category.map((cat, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm text-slate-900 font-medium">{cat._id}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 text-right">{cat.count}</td>
                          <td className="px-6 py-4 text-sm text-slate-900 font-medium text-right">Rp {cat.revenue?.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a date and click Generate Report</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Reports;