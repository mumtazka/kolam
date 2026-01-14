import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Users, Ticket, DollarSign, Activity, TrendingUp } from 'lucide-react';
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

  const statCards = [
    { label: t('admin.activeStaff'), value: stats.totalStaff, icon: Users, color: 'bg-blue-500' },
    { label: t('admin.todayTickets'), value: stats.todayTickets, icon: Ticket, color: 'bg-emerald-500' },
    { label: t('admin.todayRevenue'), value: `Rp ${stats.todayRevenue.toLocaleString('id-ID')}`, icon: DollarSign, color: 'bg-amber-500' },
    { label: t('admin.todayScans'), value: stats.todayScans, icon: Activity, color: 'bg-purple-500' },
    { label: t('admin.totalVisits'), value: stats.totalVisits.toLocaleString('id-ID'), icon: TrendingUp, color: 'bg-cyan-500' },
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

  const maxVisits = Math.max(...visitsChartData.map(d => d.total_scan), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>{t('admin.dashboard')}</h1>
        <p className="text-slate-600 mt-1">{t('admin.welcomeBack')}</p>
      </div>

      {/* Stats Grid - Flat Design with Green Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-4 border-0 shadow-sm hover:shadow-md transition-shadow" data-testid={`stat-${stat.label.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
              {/* Top Row: Label + Icon */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">{stat.label}</span>
                <Icon className="w-5 h-5 text-slate-400" />
              </div>

              {/* Value - Large and Bold */}
              <p className="text-2xl font-bold text-slate-900 mb-3">
                {stat.value}
              </p>

              {/* Green Highlight Bar */}
              <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full" style={{ width: '75%' }} />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Bar Chart - Visits Last 7 Days */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-slate-900" style={{ fontFamily: 'Outfit' }}>
            {t('admin.visitsChart')}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full">
            <span className="w-2.5 h-2.5 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full"></span>
            <span className="font-medium">{t('admin.visitors')}</span>
          </div>
        </div>

        <div className="relative h-64 flex items-end justify-around gap-4 px-4">
          {/* Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-10 pt-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="border-t border-slate-100 w-full"></div>
            ))}
          </div>

          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-10 flex flex-col justify-between text-xs text-slate-400 font-medium pr-2">
            {(() => {
              const step = Math.ceil(maxVisits / 4);
              return [...Array(5)].map((_, i) => (
                <span key={i} className="text-right">{step * (4 - i)}</span>
              ));
            })()}
          </div>

          {/* Bars */}
          <div className="flex items-end justify-around gap-3 w-full ml-8 h-full">
            {visitsChartData.map((day, idx) => {
              const percentage = maxVisits > 0 ? Math.max(5, (day.total_scan / maxVisits) * 100) : 5;
              const isToday = idx === visitsChartData.length - 1;

              return (
                <div key={idx} className="flex flex-col items-center group relative flex-1 max-w-[80px] h-full justify-end pb-10">
                  {/* Count Label */}
                  <div className="mb-2 transition-all duration-300 group-hover:scale-110">
                    <span className={`inline-block text-sm font-bold px-2 py-0.5 rounded-md ${isToday
                      ? 'bg-cyan-100 text-cyan-800'
                      : 'bg-slate-100 text-slate-700'
                      }`}>
                      {day.total_scan}
                    </span>
                  </div>

                  {/* Bar */}
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 relative cursor-pointer transform hover:scale-105 ${isToday
                      ? 'bg-gradient-to-t from-cyan-500 to-cyan-400 shadow-lg'
                      : 'bg-gradient-to-t from-slate-400 to-slate-300'
                      }`}
                    style={{
                      height: `${percentage}%`,
                      minHeight: '20px'
                    }}
                  >
                    {/* Hover shine effect */}
                    <div className="absolute inset-0 rounded-t-lg bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>

                  {/* X-Label */}
                  <div className="absolute bottom-0 left-0 right-0 h-10 flex items-center justify-center">
                    <span className={`text-xs font-medium text-center ${isToday ? 'text-cyan-700 font-bold' : 'text-slate-500'}`}>
                      {formatChartDate(day.date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Outfit' }}>{t('admin.quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            className="h-20 bg-slate-900 hover:bg-slate-800"
            data-testid="view-reports-button"
            onClick={() => navigate('/admin/reports')}
          >
            {t('admin.viewTodayReport')}
          </Button>
          <Button
            variant="outline"
            className="h-20"
            data-testid="manage-staff-button"
            onClick={() => navigate('/admin/users')}
          >
            {t('admin.manageStaff')}
          </Button>
          <Button
            variant="outline"
            className="h-20"
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
