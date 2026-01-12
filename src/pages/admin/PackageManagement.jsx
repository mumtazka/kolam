import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { getPackages, createPackage, updatePackage, deletePackage } from '../../services/adminService';

const PackageManagement = () => {
    const { t } = useLanguage();
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPackage, setEditingPackage] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        depth_range: '',
        description: ''
    });

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        try {
            const data = await getPackages();
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
                await updatePackage(editingPackage.id, formData);
                toast.success(t('common.success'));
            } else {
                await createPackage(formData);
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
                await deletePackage(packageId);
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
            depth_range: '',
            description: ''
        });
    };

    const openEditDialog = (pkg) => {
        setEditingPackage(pkg);
        setFormData({
            name: pkg.name,
            depth_range: pkg.depth_range,
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
                    <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>{t('admin.packages')}</h1>
                    <p className="text-slate-600 mt-1">{t('admin.packagesSubtitle')}</p>
                </div>
                <Button onClick={openCreateDialog} className="bg-slate-900 hover:bg-slate-800" data-testid="create-package-button">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('admin.addPackage')}
                </Button>
            </div>

            {packages.length === 0 ? (
                <Card className="p-12 text-center">
                    <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('admin.noPackages')}</h3>
                    <p className="text-slate-600 mb-4">{t('admin.createFirstPackage')}</p>
                    <Button onClick={openCreateDialog} className="bg-slate-900 hover:bg-slate-800">
                        <Plus className="w-4 h-4 mr-2" />
                        {t('admin.addPackage')}
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {packages.map((pkg) => (
                        <Card key={pkg.id} className="p-6" data-testid={`package-card-${pkg.id}`}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center mr-3">
                                        <Package className="w-5 h-5 text-sky-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 text-lg">{pkg.name}</h3>
                                        <p className="text-sm text-sky-600 font-medium">{pkg.depth_range}</p>
                                    </div>
                                </div>
                            </div>

                            {pkg.description && (
                                <p className="text-sm text-slate-600 mb-4">{pkg.description}</p>
                            )}

                            <div className="flex space-x-2 pt-4 border-t border-slate-200">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openEditDialog(pkg)}
                                    className="flex-1"
                                    data-testid={`edit-package-${pkg.id}`}
                                >
                                    <Edit className="w-4 h-4 mr-1" />
                                    {t('common.edit')}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete(pkg.id)}
                                    data-testid={`delete-package-${pkg.id}`}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent data-testid="package-form-dialog">
                    <DialogHeader>
                        <DialogTitle>{editingPackage ? t('admin.editPackage') : t('admin.newPackage')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="name">{t('admin.packageName')}</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., PAUD, SD, SMP"
                                required
                                data-testid="package-name-input"
                            />
                        </div>

                        <div>
                            <Label htmlFor="depth_range">{t('admin.depthRange')}</Label>
                            <Input
                                id="depth_range"
                                value={formData.depth_range}
                                onChange={(e) => setFormData({ ...formData, depth_range: e.target.value })}
                                placeholder="e.g., 0-40 cm, 40-100 cm"
                                required
                                data-testid="package-depth-input"
                            />
                        </div>

                        <div>
                            <Label htmlFor="description">{t('admin.description')} (Optional)</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Enter package description..."
                                rows={3}
                                data-testid="package-description-input"
                            />
                        </div>

                        <div className="flex space-x-2 pt-4">
                            <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800" data-testid="package-form-submit">
                                {editingPackage ? t('admin.update') : t('admin.create')}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                                {t('common.cancel')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PackageManagement;
