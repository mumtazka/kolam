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
import DashboardSchedule from './DashboardSchedule';

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

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className={`relative p-4 md:p-6 border-0 shadow-sm hover:shadow-md transition-all duration-300 border-l-[4px] md:border-l-[6px] border-b-[4px] md:border-b-[6px] rounded-xl ${stat.color} bg-white group cursor-default h-[140px] md:h-[180px] flex flex-col justify-between`}>
              <div className="flex justify-between items-start">
                <div className={`p-2 md:p-3 rounded-xl bg-slate-50 border border-slate-100 shadow-sm group-hover:scale-105 transition-transform duration-300 flex items-center justify-center w-10 h-10 md:w-14 md:h-14`}>
                  <Icon className={`w-5 h-5 md:w-7 md:h-7 ${stat.iconColor}`} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] md:text-[11px] font-bold tracking-wider text-teal-600 uppercase text-right leading-tight mb-1">{stat.label}</span>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-xl md:text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Left Column: Chart & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Premium Visits Chart */}
          <Card className="p-4 md:p-6 border-0 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl md:text-3xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>
                  {t('admin.visitsChart')}
                </h2>

              </div>

            </div>

            <div className="h-[250px] md:h-[350px] w-full">
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
                                {language === 'id' ? 'Pengunjung' : 'Visitors'}
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
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#0f766e' }}
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Quick Actions & System Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card className="p-4 md:p-6 h-full flex flex-col justify-center">
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 h-full">
                <Button
                  className="flex-1 h-auto sm:h-full flex flex-col items-center justify-center text-center p-3 md:p-4 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-teal-500 transition-all font-medium rounded-xl space-y-2 md:space-y-3 group"
                  variant="ghost"
                  onClick={() => navigate('/admin/reports')}
                >
                  <div className="p-3 bg-slate-50 rounded-full group-hover:bg-teal-50 transition-colors">
                    <Activity className="w-6 h-6 md:w-8 md:h-8 text-slate-400 group-hover:text-teal-600 transition-colors" />
                  </div>
                  <span className="text-sm font-bold group-hover:text-teal-700 transition-colors">{t('admin.viewTodayReport')}</span>
                </Button>

                <Button
                  className="flex-1 h-auto sm:h-full flex flex-col items-center justify-center text-center p-3 md:p-4 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 hover:border-indigo-500 transition-all font-medium rounded-xl space-y-2 md:space-y-3 group"
                  variant="ghost"
                  onClick={() => navigate('/admin/categories')}
                >
                  <div className="p-3 bg-slate-50 rounded-full group-hover:bg-indigo-50 transition-colors">
                    <Ticket className="w-6 h-6 md:w-8 md:h-8 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  <span className="text-sm font-bold group-hover:text-indigo-700 transition-colors">{t('admin.updatePrices')}</span>
                </Button>
              </div>
            </Card>

            {/* System Status - Digital Clock */}
            <Card className="p-4 md:p-6 h-full relative overflow-hidden bg-slate-900 text-white flex flex-col items-center justify-center min-h-[150px]">
              {/* Background ambient glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500 rounded-full blur-[80px] opacity-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500 rounded-full blur-[80px] opacity-20"></div>

              <div className="relative z-10 flex flex-col items-center">
                {/* Removed Header Text */}
                <div className="text-3xl md:text-5xl font-bold font-mono tracking-wider tabular-nums">
                  {currentTime.toLocaleTimeString('en-GB', { hour12: false })}
                </div>
                <div className="mt-2 text-xs md:text-sm font-medium text-slate-400 bg-white/10 px-2 md:px-3 py-1 rounded-full border border-white/5">
                  {currentTime.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>

                <div className="mt-4 md:mt-8 flex items-center gap-2">
                  {/* Operational Status Removed */}
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Right Column: Calendar & Schedule */}
        <div className="lg:col-span-1 h-full">
          <Card className="h-full p-2 border-0 shadow-sm overflow-hidden bg-white">
            <DashboardSchedule />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
