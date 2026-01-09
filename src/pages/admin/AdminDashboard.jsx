import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Users, Ticket, DollarSign, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { getUsers } from '../../services/userService';
import { getDailyReport } from '../../services/reportService';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStaff: 0,
    todayTickets: 0,
    todayRevenue: 0,
    todayScans: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [users, report] = await Promise.all([
        getUsers(),
        getDailyReport(today)
      ]);

      setStats({
        totalStaff: users.filter(u => u.is_active).length,
        todayTickets: report?.tickets_sold || 0,
        todayRevenue: report?.total_revenue || 0,
        todayScans: report?.tickets_scanned || 0
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Active Staff', value: stats.totalStaff, icon: Users, color: 'bg-blue-500' },
    { label: "Today's Tickets", value: stats.todayTickets, icon: Ticket, color: 'bg-emerald-500' },
    { label: "Today's Revenue", value: `Rp ${stats.todayRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-amber-500' },
    { label: 'Tickets Scanned', value: stats.todayScans, icon: Activity, color: 'bg-purple-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit' }}>Dashboard</h1>
        <p className="text-slate-600 mt-1">Welcome back! Here's your pool operations overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-6 stat-card" data-testid={`stat-${stat.label.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Outfit' }}>Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            className="h-20 bg-slate-900 hover:bg-slate-800"
            data-testid="view-reports-button"
            onClick={() => navigate('/admin/reports')}
          >
            View Today's Report
          </Button>
          <Button
            variant="outline"
            className="h-20"
            data-testid="manage-staff-button"
            onClick={() => navigate('/admin/users')}
          >
            Manage Staff
          </Button>
          <Button
            variant="outline"
            className="h-20"
            data-testid="update-prices-button"
            onClick={() => navigate('/admin/categories')}
          >
            Update Prices
          </Button>
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4" style={{ fontFamily: 'Outfit' }}>System Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-slate-700 font-medium">All systems operational</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;