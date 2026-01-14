import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash, X, Check, Ticket, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
    getCategories,
    createCategory,
    updateCategory,
    toggleCategoryActive,
    deleteCategory
} from '../../services/categoryService';

const CategoryManagement = () => {
    const { t } = useLanguage();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        code_prefix: '',
        price: '',
        requires_nim: false,
        active: true,
        description: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const data = await getCategories();
            setCategories(data);
        } catch (error) {
            console.error(error);
            toast.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            code_prefix: '',
            price: '',
            requires_nim: false,
            active: true,
            description: ''
        });
        setEditingId(null);
        setShowForm(false);
    };

    const handleDataOpen = (isOpen) => {
        setShowForm(isOpen);
        if (!isOpen) {
            resetForm();
        }
    };

    const handleEdit = (category) => {
        setFormData({
            name: category.name,
            code_prefix: category.code_prefix,
            price: category.price?.toString() || '',
            requires_nim: category.requires_nim,
            active: category.active,
            description: category.description || ''
        });
        setEditingId(category.id);
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.name.trim()) {
            toast.error(t('admin.categoryName') + ' ' + t('common.required'));
            return;
        }
        if (!formData.code_prefix.trim()) {
            toast.error(t('admin.codePrefix') + ' ' + t('common.required'));
            return;
        }
        if (formData.code_prefix.length > 3) {
            toast.error(t('admin.codePrefix') + ' max 3 chars');
            return;
        }
        if (!formData.price || parseFloat(formData.price) < 0) {
            toast.error(t('dashboard.price') + ' ' + t('common.required'));
            return;
        }

        setSubmitting(true);
        try {
            const categoryData = {
                name: formData.name.trim(),
                code_prefix: formData.code_prefix.toUpperCase().trim(),
                price: parseFloat(formData.price),
                requires_nim: formData.requires_nim,
                active: formData.active,
                description: formData.description.trim() || null
            };

            if (editingId) {
                await updateCategory(editingId, categoryData);
                toast.success(t('common.success'));
            } else {
                await createCategory(categoryData);
                toast.success(t('common.success'));
            }

            resetForm();
            fetchCategories();
        } catch (error) {
            console.error(error);
            toast.error(error.message || t('common.error'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (category) => {
        try {
            await toggleCategoryActive(category.id, !category.active);
            toast.success(t('common.success'));
            fetchCategories();
        } catch (error) {
            console.error(error);
            toast.error(t('common.error'));
        }
    };

    const handleDelete = async (categoryId) => {
        if (!window.confirm(t('admin.deleteConfirm') || "WARNING: This will delete the category AND ALL associated tickets/scan logs. This action cannot be undone. Are you sure?")) {
            return;
        }

        try {
            await deleteCategory(categoryId);
            toast.success(t('common.success'));
            fetchCategories();
        } catch (error) {
            console.error(error);
            toast.error(t('common.error'));
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
            {/* Header */}
            <div className="flex items-center justify-end">
                <Button
                    onClick={() => setShowForm(true)}
                    className="bg-slate-900 hover:bg-slate-800"
                    data-testid="add-category-button"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('admin.addCategory')}
                </Button>
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={showForm} onOpenChange={handleDataOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? t('admin.editCategory') : t('admin.newCategory')}
                        </DialogTitle>
                        <DialogDescription>
                            {editingId ? t('admin.categoryFormDescriptionUpdate') : t('admin.categoryFormDescriptionCreate')}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="name">{t('admin.categoryName')} *</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Umum, VIP, Mahasiswa"
                                    className="mt-1"
                                    data-testid="category-name-input"
                                />
                            </div>

                            <div>
                                <Label htmlFor="code_prefix">{t('admin.codePrefix')} * (1-3 chars)</Label>
                                <Input
                                    id="code_prefix"
                                    value={formData.code_prefix}
                                    onChange={(e) => setFormData({ ...formData, code_prefix: e.target.value.toUpperCase().slice(0, 3) })}
                                    placeholder="e.g., U, VIP, M"
                                    maxLength={3}
                                    className="mt-1 uppercase"
                                    data-testid="category-prefix-input"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    {t('admin.ticketCodeExample')}: {formData.code_prefix || 'XXX'}-20260112-0001-A1B2
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="price">{t('dashboard.price')} (Rp) *</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    min="0"
                                    step="1000"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="e.g., 15000"
                                    className="mt-1"
                                    data-testid="category-price-input"
                                />
                            </div>

                            <div>
                                <Label htmlFor="description">{t('admin.description')}</Label>
                                <Input
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Optional description"
                                    className="mt-1"
                                    data-testid="category-description-input"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-6 pt-2">
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="requires_nim"
                                    checked={formData.requires_nim}
                                    onCheckedChange={(checked) => setFormData({ ...formData, requires_nim: checked })}
                                    data-testid="category-nim-switch"
                                />
                                <Label htmlFor="requires_nim" className="cursor-pointer">
                                    {t('admin.requiresNim')} (Student ID)
                                </Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="active"
                                    checked={formData.active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                                    data-testid="category-active-switch"
                                />
                                <Label htmlFor="active" className="cursor-pointer">
                                    {t('admin.active')}
                                </Label>
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleDataOpen(false)}
                                disabled={submitting}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-slate-900 hover:bg-slate-800"
                                data-testid="save-category-button"
                            >
                                {submitting ? t('admin.saving') : editingId ? t('admin.updateCategory') : t('admin.createCategory')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                    <Card
                        key={category.id}
                        className={`p-5 transition-all ${!category.active ? 'opacity-60 bg-slate-50' : ''}`}
                        data-testid={`category-card-${category.id}`}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg ${category.active ? 'bg-sky-100 text-sky-700' : 'bg-slate-200 text-slate-500'}`}>
                                    {category.code_prefix}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-slate-900">{category.name}</h3>
                                    <p className="text-sm text-slate-500">{category.description || t('common.unknown')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">{t('dashboard.price')}:</span>
                                <span className="font-semibold text-slate-900">Rp {(category.price || 0).toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">{t('dashboard.ticket')} {t('common.code')}:</span>
                                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                                    {category.code_prefix}-YYYYMMDD-XXXX
                                </span>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                {category.requires_nim && (
                                    <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        {t('admin.requiresNim')}
                                    </span>
                                )}
                                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${category.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                    {category.active ? t('admin.active') : t('admin.disable')}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(category)}
                                className="flex-1"
                                data-testid={`edit-category-${category.id}`}
                            >
                                <Pencil className="w-4 h-4 mr-1" />
                                {t('common.edit')}
                            </Button>
                            <Button
                                variant={category.active ? 'outline' : 'default'}
                                size="sm"
                                onClick={() => handleToggleActive(category)}
                                className={`flex-1 ${!category.active ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                                data-testid={`toggle-category-${category.id}`}
                            >
                                {category.active ? t('admin.disable') : t('admin.enable')}
                            </Button>
                            <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => handleDelete(category.id)}
                                className="w-9 h-9"
                                title="Delete"
                            >
                                <Trash className="w-4 h-4" />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {categories.length === 0 && (
                <Card className="p-12 text-center">
                    <Ticket className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('admin.noCategories')}</h3>
                    <p className="text-slate-600 mb-4">{t('admin.createFirst')}</p>
                    <Button
                        onClick={() => setShowForm(true)}
                        className="bg-slate-900 hover:bg-slate-800"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('admin.addCategory')}
                    </Button>
                </Card>
            )}
        </div>
    );
};

export default CategoryManagement;
