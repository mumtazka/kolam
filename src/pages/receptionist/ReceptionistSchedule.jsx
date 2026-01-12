import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../../components/ui/card';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';
import { getSessions } from '../../services/adminService';

const ReceptionistSchedule = () => {
    const { t } = useLanguage();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const data = await getSessions();
            setSessions(data);
        } catch (error) {
            console.error(error);
            toast.error(t('common.error'));
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
                    <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Jadwal Sesi & Operasional</h1>
                    <p className="text-slate-600 mt-1">Informasi sesi kolam renang</p>
                </div>
            </div>

            {sessions.length === 0 ? (
                <Card className="p-12 text-center">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('admin.noSessions')}</h3>
                </Card>
            ) : (
                <Card className="overflow-hidden shadow-lg border-0 ring-1 ring-slate-200">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">{t('admin.sessionName')}</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">{t('common.time')}</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">{t('admin.days')}</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">{t('admin.recurring')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {sessions.map((session) => (
                                    <tr key={session.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-sm text-slate-900 font-medium">{session.name}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <span className="inline-flex items-center bg-slate-100 px-2 py-1 rounded text-slate-700">
                                                <Clock className="w-3 h-3 mr-1.5" />
                                                {session.start_time} - {session.end_time}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {session.days?.map(day => (
                                                    <span key={day} className="inline-flex px-2 py-1 text-xs font-medium rounded bg-sky-100 text-sky-700 border border-sky-200">
                                                        {day.substring(0, 3)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {session.is_recurring ? (
                                                <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                                                    {t('common.yes')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                                                    {t('common.no')}
                                                </span>
                                            )}
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

export default ReceptionistSchedule;
