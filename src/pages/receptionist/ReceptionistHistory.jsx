import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Calendar, FileBarChart, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { getDailyReport } from '../../services/reportService';

const ReceptionistHistory = () => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [stats, setStats] = useState({ totalTickets: 0, totalRevenue: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDailyHistory();
    }, []);

    const fetchDailyHistory = async () => {
        try {
            // Fetch today's report
            const today = new Date().toISOString().split('T')[0];
            const data = await getDailyReport(today);

            // Allow seeing all transactions for the day (or filter by user if strict)
            // For now, showing all daily transactions helps with handover/verification
            setTransactions(data.tickets || []);

            // Calculate simple stats
            setStats({
                totalTickets: data.tickets_sold,
                totalRevenue: data.total_revenue
            });

        } catch (error) {
            console.error(error);
            toast.error('Gagal memuat riwayat transaksi');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Riwayat Transaksi Hari Ini</h1>
                    <p className="text-slate-600 mt-1">
                        <span className="font-medium">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </p>
                </div>
                <div className="flex gap-4">
                    <Card className="px-4 py-2 bg-slate-900 text-white border-0">
                        <div className="text-xs text-slate-400">Total Revenue</div>
                        <div className="text-lg font-bold">Rp {stats.totalRevenue.toLocaleString()}</div>
                    </Card>
                    <Card className="px-4 py-2 bg-sky-600 text-white border-0">
                        <div className="text-xs text-sky-100">Tiket Terjual</div>
                        <div className="text-lg font-bold">{stats.totalTickets}</div>
                    </Card>
                </div>
            </div>

            {transactions.length === 0 ? (
                <Card className="p-12 text-center">
                    <FileBarChart className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Belum ada transaksi hari ini</h3>
                    <p className="text-slate-500">Transaksi penjualan tiket akan muncul di sini.</p>
                </Card>
            ) : (
                <Card className="overflow-hidden shadow-lg border-0 ring-1 ring-slate-200">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Waktu</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Kode Tiket</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Kategori</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Harga</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Kasir</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {transactions.map((t, index) => (
                                    <tr key={index} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                                            {new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-900 font-bold font-mono">
                                            {t.ticket_code}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-700">
                                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-xs font-medium">
                                                <Receipt className="w-3 h-3 mr-1" />
                                                {t.category_name}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                                            Rp {t.price.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {t.created_by_name || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default ReceptionistHistory;
