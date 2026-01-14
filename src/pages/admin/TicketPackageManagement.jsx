import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit, Trash2, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { getTicketPackages, createTicketPackage, updateTicketPackage, deleteTicketPackage } from '../../services/adminService';

const TicketPackageManagement = () => {
    const { t } = useLanguage();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        min_people: 1,
        price_per_person: '',
        is_active: true,
        description: ''
    });

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        try {
            const data = await getTicketPackages();
            setPackages(data);
        } catch (error) {
            console.error(error);
            toast.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingPackage) {
                await updateTicketPackage(editingPackage.id, formData);
                toast.success(t('common.success'));
            } else {
                await createTicketPackage(formData);
                toast.success(t('common.success'));
            }
            setDialogOpen(false);
            setEditingPackage(null);
            resetForm();
            fetchPackages();
        } catch (error) {
            console.error(error);
            toast.error(error.message || t('common.error'));
        }
    };

    const handleDelete = async (packageId) => {
        if (window.confirm(t('admin.confirmStatusChange'))) {
            try {
                await deleteTicketPackage(packageId);
                toast.success(t('common.success'));
                fetchPackages();
            } catch (error) {
                console.error(error);
                toast.error(t('common.error'));
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            min_people: 1,
            price_per_person: '',
            is_active: true,
            description: ''
        });
    };

    const openEditDialog = (pkg) => {
        setEditingPackage(pkg);
        setFormData({
            name: pkg.name,
            min_people: pkg.min_people,
            price_per_person: pkg.price_per_person,
            is_active: pkg.is_active,
            description: pkg.description || ''
        });
        setDialogOpen(true);
    };

    const openCreateDialog = () => {
        setEditingPackage(null);
        resetForm();
        setDialogOpen(true);
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
                    <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Manajemen Paket Tiket</h1>
                    <p className="text-slate-600 mt-1">Kelola paket harga khusus (contoh: Rombongan)</p>
                </div>
                <Button onClick={openCreateDialog} className="bg-slate-900 hover:bg-slate-800">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Paket
                </Button>
            </div>

            {packages.length === 0 ? (
                <Card className="p-12 text-center">
                    <Ticket className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Belum ada paket tiket</h3>
                    <p className="text-slate-600 mb-4">Buat paket pertama Anda untuk tiket rombongan atau khusus.</p>
                    <Button onClick={openCreateDialog} className="bg-slate-900 hover:bg-slate-800">
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Paket
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {packages.map((pkg) => (
                        <Card key={pkg.id} className={`p-6 ${!pkg.is_active ? 'opacity-60 bg-slate-100' : ''}`}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                                        <Ticket className="w-5 h-5 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 text-lg">{pkg.name}</h3>
                                        <div className="flex gap-2 text-sm">
                                            <span className="text-emerald-600 font-bold">Rp {pkg.price_per_person?.toLocaleString()} / org</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded text-xs font-bold ${pkg.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                    {pkg.is_active ? 'AKTIF' : 'NONAKTIF'}
                                </div>
                            </div>

                            <div className="text-sm text-slate-600 mb-4 space-y-1">
                                <p><strong>Min. Orang:</strong> {pkg.min_people} Orang</p>
                                {pkg.description && <p>{pkg.description}</p>}
                            </div>

                            <div className="flex space-x-2 pt-4 border-t border-slate-200">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditDialog(pkg)}
                                    className="flex-1"
                                >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Edit
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete(pkg.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingPackage ? 'Edit Paket Tiket' : 'Paket Tiket Baru'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Nama Paket</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Contoh: Rombongan 30 Orang"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="min_people">Minimum Orang</Label>
                                <Input
                                    id="min_people"
                                    type="number"
                                    min="1"
                                    value={formData.min_people}
                                    onChange={(e) => setFormData({ ...formData, min_people: e.target.value })}
                                    placeholder="30"
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="price_per_person">Harga Per Orang</Label>
                                <Input
                                    id="price_per_person"
                                    type="number"
                                    min="0"
                                    value={formData.price_per_person}
                                    onChange={(e) => setFormData({ ...formData, price_per_person: e.target.value })}
                                    placeholder="6000"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="active">Status</Label>
                            <div className="flex items-center space-x-2 mt-2">
                                <input
                                    type="checkbox"
                                    id="active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300 text-slate-900 focus:ring-slate-900"
                                />
                                <Label htmlFor="active" className="font-normal text-slate-600">
                                    Aktif
                                </Label>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="description">Deskripsi (Opsional)</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Keterangan tambahan..."
                                rows={3}
                            />
                        </div>

                        <div className="flex space-x-2 pt-4">
                            <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800">
                                {editingPackage ? 'Simpan Perubahan' : 'Buat Paket'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                                Batal
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TicketPackageManagement;
