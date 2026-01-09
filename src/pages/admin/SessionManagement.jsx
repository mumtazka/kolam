import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { getSessions, createSession, updateSession, deleteSession } from '../../services/adminService';

const DAYS_OF_WEEK = [
    { id: 'Monday', label: 'Mon' },
    { id: 'Tuesday', label: 'Tue' },
    { id: 'Wednesday', label: 'Wed' },
    { id: 'Thursday', label: 'Thu' },
    { id: 'Friday', label: 'Fri' },
    { id: 'Saturday', label: 'Sat' },
    { id: 'Sunday', label: 'Sun' }
];

const SessionManagement = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSession, setEditingSession] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        start_time: '07:00',
        end_time: '08:30',
        days: [],
        is_recurring: true
    });

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const data = await getSessions();
            setSessions(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load sessions');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.days.length === 0) {
            toast.error('Please select at least one day');
            return;
        }

        try {
            if (editingSession) {
                await updateSession(editingSession.id, formData);
                toast.success('Session updated successfully');
            } else {
                await createSession(formData);
                toast.success('Session created successfully');
            }
            setDialogOpen(false);
            setEditingSession(null);
            resetForm();
            fetchSessions();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Operation failed');
        }
    };

    const handleDelete = async (sessionId) => {
        if (window.confirm('Are you sure you want to delete this session?')) {
            try {
                await deleteSession(sessionId);
                toast.success('Session deleted');
                fetchSessions();
            } catch (error) {
                console.error(error);
                toast.error('Failed to delete session');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            start_time: '07:00',
            end_time: '08:30',
            days: [],
            is_recurring: true
        });
    };

    const openEditDialog = (session) => {
        setEditingSession(session);
        setFormData({
            name: session.name,
            start_time: session.start_time,
            end_time: session.end_time,
            days: session.days || [],
            is_recurring: session.is_recurring
        });
        setDialogOpen(true);
    };

    const openCreateDialog = () => {
        setEditingSession(null);
        resetForm();
        setDialogOpen(true);
    };

    const toggleDay = (dayId) => {
        setFormData(prev => ({
            ...prev,
            days: prev.days.includes(dayId)
                ? prev.days.filter(d => d !== dayId)
                : [...prev.days, dayId]
        }));
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
                    <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Session Management</h1>
                    <p className="text-slate-600 mt-1">Manage pool sessions and schedules</p>
                </div>
                <Button onClick={openCreateDialog} className="bg-slate-900 hover:bg-slate-800" data-testid="create-session-button">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Session
                </Button>
            </div>

            {sessions.length === 0 ? (
                <Card className="p-12 text-center">
                    <Clock className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Sessions</h3>
                    <p className="text-slate-600 mb-4">Create your first session to get started</p>
                    <Button onClick={openCreateDialog} className="bg-slate-900 hover:bg-slate-800">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Session
                    </Button>
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Session Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Time</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Days</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Recurring</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {sessions.map((session) => (
                                    <tr key={session.id} className="hover:bg-slate-50" data-testid={`session-row-${session.id}`}>
                                        <td className="px-6 py-4 text-sm text-slate-900 font-medium">{session.name}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            <span className="inline-flex items-center">
                                                <Clock className="w-4 h-4 mr-1 text-slate-400" />
                                                {session.start_time} - {session.end_time}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {session.days?.map(day => (
                                                    <span key={day} className="inline-flex px-2 py-1 text-xs font-medium rounded bg-sky-100 text-sky-700">
                                                        {day.substring(0, 3)}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {session.is_recurring ? (
                                                <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                                                    Yes
                                                </span>
                                            ) : (
                                                <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                                                    No
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex space-x-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEditDialog(session)}
                                                    data-testid={`edit-session-${session.id}`}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDelete(session.id)}
                                                    data-testid={`delete-session-${session.id}`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent data-testid="session-form-dialog">
                    <DialogHeader>
                        <DialogTitle>{editingSession ? 'Edit Session' : 'Add New Session'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Session Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Session 1, Club Caesar"
                                required
                                data-testid="session-name-input"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="start_time">Start Time</Label>
                                <Input
                                    id="start_time"
                                    type="time"
                                    value={formData.start_time}
                                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                    required
                                    data-testid="session-start-time-input"
                                />
                            </div>
                            <div>
                                <Label htmlFor="end_time">End Time</Label>
                                <Input
                                    id="end_time"
                                    type="time"
                                    value={formData.end_time}
                                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                    required
                                    data-testid="session-end-time-input"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="mb-3 block">Days of Week</Label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS_OF_WEEK.map(day => (
                                    <button
                                        key={day.id}
                                        type="button"
                                        onClick={() => toggleDay(day.id)}
                                        className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${formData.days.includes(day.id)
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                                            }`}
                                        data-testid={`session-day-${day.id.toLowerCase()}`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <Label htmlFor="is_recurring" className="cursor-pointer">Recurring Session</Label>
                            <Switch
                                id="is_recurring"
                                checked={formData.is_recurring}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
                                data-testid="session-recurring-switch"
                            />
                        </div>

                        <div className="flex space-x-2 pt-4">
                            <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800" data-testid="session-form-submit">
                                {editingSession ? 'Update' : 'Create'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                                Cancel
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default SessionManagement;
