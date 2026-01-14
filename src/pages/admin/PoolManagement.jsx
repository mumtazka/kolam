import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { Switch } from '../../components/ui/switch';
import { Plus, Edit, Trash2, Droplets, Ruler, CheckCircle, XCircle, Image as ImageIcon, ZoomIn, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getPools, createPool, updatePool, deletePool, uploadPoolImage } from '../../services/adminService';

const PoolManagement = () => {
    const { t } = useLanguage();
    const [pools, setPools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [zoomImage, setZoomImage] = useState(null); // URL of image to zoom
    const [editingPool, setEditingPool] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ open: false, poolId: null });
    const [formData, setFormData] = useState({
        name: '',
        depth: '',
        area: '',
        description: '',
        active: true,
        image_url: ''
    });

    useEffect(() => {
        fetchPools();
    }, []);

    const fetchPools = async () => {
        try {
            const data = await getPools();
            setPools(data);
        } catch (error) {
            console.error(error);
            toast.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const publicUrl = await uploadPoolImage(file);
            setFormData({ ...formData, image_url: publicUrl });
            toast.success(t('common.success'));
        } catch (error) {
            console.error(error);
            toast.error(t('common.error') + ': ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const submitData = {
                name: formData.name,
                depth: formData.depth,
                area: formData.area ? parseFloat(formData.area) : 0,
                description: formData.description,
                active: formData.active,
                image_url: formData.image_url
            };

            if (editingPool) {
                await updatePool(editingPool.id, submitData);
                toast.success(t('common.success'));
            } else {
                await createPool(submitData);
                toast.success(t('common.success'));
            }
            setDialogOpen(false);
            setEditingPool(null);
            resetForm();
            fetchPools();
        } catch (error) {
            console.error(error);
            toast.error(error.message || t('common.error'));
        }
    };

    const handleDelete = (poolId) => {
        setConfirmDialog({ open: true, poolId });
    };

    const confirmDelete = async () => {
        try {
            await deletePool(confirmDialog.poolId);
            toast.success(t('common.success'));
            fetchPools();
        } catch (error) {
            console.error(error);
            toast.error(t('common.error'));
        } finally {
            setConfirmDialog({ open: false, poolId: null });
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            depth: '',
            area: '',
            description: '',
            active: true,
            image_url: ''
        });
    };

    const openEditDialog = (pool) => {
        setEditingPool(pool);
        setFormData({
            name: pool.name,
            depth: pool.depth,
            area: pool.area || '',
            description: pool.description || '',
            active: pool.active,
            image_url: pool.image_url || ''
        });
        setDialogOpen(true);
    };

    const openCreateDialog = () => {
        setEditingPool(null);
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
            <div className="flex items-center justify-end">
                <Button onClick={openCreateDialog} className="bg-slate-900 hover:bg-slate-800" data-testid="create-pool-button">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('admin.addPool')}
                </Button>
            </div>

            {pools.length === 0 ? (
                <Card className="p-12 text-center">
                    <Droplets className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('admin.noPools')}</h3>
                    <p className="text-slate-600 mb-4">{t('admin.createFirstPool')}</p>
                    <Button onClick={openCreateDialog} className="bg-slate-900 hover:bg-slate-800">
                        <Plus className="w-4 h-4 mr-2" />
                        {t('admin.addPool')}
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pools.map((pool) => (
                        <Card key={pool.id} className={`overflow-hidden border-0 shadow-lg ring-1 ${pool.active ? 'ring-slate-200' : 'ring-slate-200 bg-slate-50'}`} data-testid={`pool-card-${pool.id}`}>
                            {/* Pool Image */}
                            <div className="h-48 w-full bg-slate-100 relative group">
                                {pool.image_url ? (
                                    <>
                                        <img src={pool.image_url} alt={pool.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer" onClick={() => setZoomImage(pool.image_url)}>
                                            <ZoomIn className="w-8 h-8 text-white drop-shadow-lg" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <ImageIcon className="w-12 h-12" />
                                    </div>
                                )}
                                <div className="absolute top-3 right-3">
                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full shadow-sm ${pool.active ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'}`}>
                                        {pool.active ? t('admin.active') : t('admin.inactive')}
                                    </span>
                                </div>
                            </div>

                            <div className="p-5">
                                <h3 className="text-xl font-bold text-slate-900 mb-1">{pool.name}</h3>
                                <div className="flex items-center text-sm text-slate-500 mb-3 space-x-3">
                                    <span className="flex items-center"><Ruler className="w-4 h-4 mr-1" /> {pool.area} {t('admin.metersSquared')}</span>
                                    <span className="flex items-center"><Droplets className="w-4 h-4 mr-1" /> {pool.depth}</span>
                                </div>

                                {pool.description && (
                                    <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                                        {pool.description}
                                    </p>
                                )}

                                <div className="flex space-x-2 pt-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => openEditDialog(pool)}
                                        className="flex-1"
                                        data-testid={`edit-pool-${pool.id}`}
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        {t('common.edit')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDelete(pool.id)}
                                        data-testid={`delete-pool-${pool.id}`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Image Zoom Modal */}
            <Dialog open={!!zoomImage} onOpenChange={(open) => !open && setZoomImage(null)}>
                <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none" aria-describedby="zoom-description">
                    <DialogDescription className="sr-only" id="zoom-description">
                        {t('admin.zoomedView')}
                    </DialogDescription>
                    {zoomImage && (
                        <img src={zoomImage} alt="Zoomed Pool" className="w-full h-auto rounded-lg shadow-2xl" />
                    )}
                </DialogContent>
            </Dialog>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent data-testid="pool-form-dialog" aria-describedby="form-description">
                    <DialogHeader>
                        <DialogTitle>{editingPool ? t('admin.editPool') : t('admin.newPool')}</DialogTitle>
                        <DialogDescription id="form-description">
                            {editingPool ? t('admin.poolFormDescriptionUpdate') : t('admin.poolFormDescriptionCreate')}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Image Upload */}
                        <div>
                            <Label>{t('admin.poolImage')}</Label>
                            <div className="mt-2 flex items-center gap-4">
                                {formData.image_url && (
                                    <div className="w-24 h-24 rounded-lg overflow-hidden border border-slate-200 relative">
                                        <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, image_url: '' })}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                                <div className="flex-1">
                                    <Label htmlFor="image-upload" className="cursor-pointer inline-flex items-center px-4 py-2 bg-white border border-slate-300 rounded-md font-semibold text-xs text-slate-700 uppercase tracking-widest shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-25 transition ease-in-out duration-150">
                                        {uploading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                {t('admin.uploading')}
                                            </>
                                        ) : (
                                            <>
                                                <ImageIcon className="w-4 h-4 mr-2" />
                                                {formData.image_url ? t('admin.changeImage') : t('admin.uploadImage')}
                                            </>
                                        )}
                                    </Label>
                                    <Input
                                        id="image-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleFileChange}
                                        disabled={uploading}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">{t('admin.imageHelperText')}</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="name">{t('admin.poolName')}</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={t('admin.poolPlaceholder')}
                                required
                                data-testid="pool-name-input"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="depth">{t('admin.depth')}</Label>
                                <Input
                                    id="depth"
                                    value={formData.depth}
                                    onChange={(e) => setFormData({ ...formData, depth: e.target.value })}
                                    placeholder={t('admin.depthPlaceholder')}
                                    required
                                    data-testid="pool-depth-input"
                                />
                            </div>
                            <div>
                                <Label htmlFor="area">{t('admin.area')}</Label>
                                <Input
                                    id="area"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.area}
                                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                                    placeholder={t('admin.areaPlaceholder')}
                                    data-testid="pool-area-input"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="description">{t('admin.description')}</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder={t('admin.optionalDescription')}
                                data-testid="pool-description-input"
                            />
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Switch
                                id="active"
                                checked={formData.active}
                                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                                data-testid="pool-active-switch"
                            />
                            <Label htmlFor="active" className="cursor-pointer">{t('admin.active')}</Label>
                        </div>

                        <div className="flex space-x-2 pt-4">
                            <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800" data-testid="pool-form-submit" disabled={uploading}>
                                {editingPool ? t('admin.update') : t('admin.create')}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                                {t('common.cancel')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={confirmDialog.open}
                onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
                title="Hapus Data Kolam"
                description="Apakah Anda yakin ingin menghapus data kolam ini? Semua informasi terkait kolam akan dihapus secara permanen dari sistem."
                onConfirm={confirmDelete}
                onCancel={() => setConfirmDialog({ open: false, poolId: null })}
                confirmText="Ya, Hapus Data"
                cancelText="Batal"
                variant="danger"
            />
        </div>
    );
};

export default PoolManagement;
