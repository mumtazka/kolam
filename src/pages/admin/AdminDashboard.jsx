import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Users, Ticket, DollarSign, Activity, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { getUsers } from '../../services/userService';
import { getDailyReport, getTotalVisits, getVisitsLast7Days } from '../../services/reportService';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [stats, setStats] = useState({
    totalStaff: 0,
    todayTickets: 0,
    todayRevenue: 0,
    todayScans: 0,
    totalVisits: 0
  });
  const [visitsChartData, setVisitsChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch each data source with individual error handling
      let users = [];
      let report = null;
      let totalVisits = 0;
      let visitsData = [];

      try {
        users = await getUsers();
      } catch (e) {
        console.warn('Failed to fetch users:', e);
      }

      try {
        report = await getDailyReport(today);
      } catch (e) {
        console.warn('Failed to fetch daily report:', e);
      }

      try {
        totalVisits = await getTotalVisits();
      } catch (e) {
        console.warn('Failed to fetch total visits (scan_logs may not exist):', e);
        totalVisits = 0;
      }

      try {
        visitsData = await getVisitsLast7Days();
      } catch (e) {
        console.warn('Failed to fetch visits chart data (scan_logs may not exist):', e);
        // Generate empty 7-day data as fallback
        visitsData = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return { date: d.toISOString().split('T')[0], total_scan: 0 };
        });
      }

      setStats({
        totalStaff: users.filter(u => u.is_active).length,
        todayTickets: report?.tickets_sold || 0,
        todayRevenue: report?.total_revenue || 0,
        todayScans: report?.tickets_scanned || 0,
        totalVisits: totalVisits
      });
      setVisitsChartData(visitsData);
    } catch (error) {
      console.error(error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const RupiahIcon = () => (
    <span className="text-xl font-bold text-teal-600">Rp</span>
  );

  const statCards = [
    { label: t('admin.activeStaff'), value: stats.totalStaff, icon: Users, color: 'border-teal-500', iconColor: 'text-teal-500' },
    { label: t('admin.todayRevenue'), value: `Rp ${stats.todayRevenue.toLocaleString('id-ID')}`, icon: RupiahIcon, color: 'border-teal-500', iconColor: 'text-teal-500' },
    { label: 'PENGUNJUNG HARI INI', value: stats.todayScans, icon: Users, color: 'border-teal-500', iconColor: 'text-teal-500' },
    { label: t('admin.totalVisits'), value: stats.totalVisits.toLocaleString('id-ID'), icon: TrendingUp, color: 'border-slate-800', iconColor: 'text-slate-800' },
  ];

  // Format date for display (e.g., "08 Jan" or "Jan 08")
  const formatChartDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
      day: '2-digit',
      month: 'short'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }



  return (
    <div className="space-y-6">

      {/* Stats Grid - "Card UI" Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className={`relative p-6 border-0 shadow-sm hover:shadow-md transition-all duration-300 border-l-[6px] border-b-[6px] rounded-xl ${stat.color} bg-white group cursor-default h-[180px] flex flex-col justify-between`}>
              <div className="flex justify-between items-start">
                <div className={`p-3 rounded-xl bg-slate-50 border border-slate-100 shadow-sm group-hover:scale-105 transition-transform duration-300 flex items-center justify-center w-14 h-14`}>
                  <Icon className={`w-7 h-7 ${stat.iconColor}`} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-bold tracking-wider text-teal-600 uppercase text-right leading-tight mb-1">{stat.label}</span>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Premium Visits Chart */}
      <Card className="p-6 border-0 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>
              {t('admin.visitsChart')}
            </h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Visitor trends over the last 7 days
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-lg border border-teal-100/50">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500"></span>
            </span>
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">{t('admin.visitors')}</span>
          </div>
        </div>

        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={visitsChartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tickFormatter={(date) => formatChartDate(date)}
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                dx={-10}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100">
                        <p className="text-xs font-semibold text-slate-500 mb-1 pointer-events-none">
                          {formatChartDate(label)}
                        </p>
                        <div className="flex items-center gap-2 pointer-events-none">
                          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                          <span className="text-lg font-bold text-slate-900 pointer-events-none">
                            {payload[0].value}
                          </span>
                          <span className="text-xs text-slate-500 font-medium pointer-events-none">
                            Visitors
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="total_scan"
                stroke="#14b8a6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorVisits)"
                activeDot={{ r: 6, strokeWidth: 0, fill: '#0f766e' }} // Darker teal for active dot
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Outfit' }}>{t('admin.quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            className="h-20 bg-teal-500 hover:bg-teal-600 text-white"
            data-testid="view-reports-button"
            onClick={() => navigate('/admin/reports')}
          >
            {t('admin.viewTodayReport')}
          </Button>
          <Button
            className="h-20 bg-teal-500 hover:bg-teal-600 text-white"
            data-testid="manage-staff-button"
            onClick={() => navigate('/admin/users')}
          >
            {t('admin.manageStaff')}
          </Button>
          <Button
            className="h-20 bg-teal-500 hover:bg-teal-600 text-white"
            data-testid="update-prices-button"
            onClick={() => navigate('/admin/categories')}
          >
            {t('admin.updatePrices')}
          </Button>
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Outfit' }}>{t('admin.systemStatus')}</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-slate-700 font-medium">{t('admin.allSystemsOperational')}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;
