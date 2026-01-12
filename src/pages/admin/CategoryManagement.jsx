import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { Plus, Pencil, X, Check, Ticket, AlertCircle } from 'lucide-react';
import {
    getCategories,
    createCategory,
    updateCategory,
    toggleCategoryActive,
    deleteCategory
} from '../../services/categoryService';

const CategoryManagement = () => {
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
            toast.error('Failed to load categories');
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
            toast.error('Category name is required');
            return;
        }
        if (!formData.code_prefix.trim()) {
            toast.error('Code prefix is required');
            return;
        }
        if (formData.code_prefix.length > 3) {
            toast.error('Code prefix must be 1-3 characters');
            return;
        }
        if (!formData.price || parseFloat(formData.price) < 0) {
            toast.error('Valid price is required');
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
                toast.success('Category updated successfully');
            } else {
                await createCategory(categoryData);
                toast.success('Category created successfully');
            }

            resetForm();
            fetchCategories();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Failed to save category');
        } finally {
            setSubmitting(false);
        }
    };

    const handleToggleActive = async (category) => {
        try {
            await toggleCategoryActive(category.id, !category.active);
            toast.success(`Category ${!category.active ? 'enabled' : 'disabled'}`);
            fetchCategories();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update category status');
        }
    };

    const handleDelete = async (categoryId) => {
        if (!confirm('Are you sure you want to delete this category? This may affect existing tickets.')) {
            return;
        }

        try {
            await deleteCategory(categoryId);
            toast.success('Category deleted');
            fetchCategories();
        } catch (error) {
            console.error(error);
            toast.error('Cannot delete category - it may have associated tickets');
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>
                        Ticket Categories
                    </h1>
                    <p className="text-slate-600 mt-1">Manage ticket categories, prefixes, and pricing</p>
                </div>
                {!showForm && (
                    <Button
                        onClick={() => setShowForm(true)}
                        className="bg-slate-900 hover:bg-slate-800"
                        data-testid="add-category-button"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Category
                    </Button>
                )}
            </div>

            {/* Add/Edit Form */}
            {showForm && (
                <Card className="p-6 border-2 border-sky-500" data-testid="category-form">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-slate-900">
                                {editingId ? 'Edit Category' : 'New Category'}
                            </h2>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={resetForm}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="name">Category Name *</Label>
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
                                <Label htmlFor="code_prefix">Code Prefix * (1-3 chars)</Label>
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
                                    Used in ticket codes: {formData.code_prefix || 'XXX'}-20260112-0001-A1B2
                                </p>
                            </div>

                            <div>
                                <Label htmlFor="price">Price (Rp) *</Label>
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
                                <Label htmlFor="description">Description</Label>
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
                                    Requires NIM (Student ID)
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
                                    Active
                                </Label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetForm}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-slate-900 hover:bg-slate-800"
                                data-testid="save-category-button"
                            >
                                {submitting ? 'Saving...' : editingId ? 'Update Category' : 'Create Category'}
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

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
                                    <p className="text-sm text-slate-500">{category.description || 'No description'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Price:</span>
                                <span className="font-semibold text-slate-900">Rp {(category.price || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Ticket Code:</span>
                                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                                    {category.code_prefix}-YYYYMMDD-XXXX
                                </span>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                {category.requires_nim && (
                                    <span className="inline-flex items-center px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        NIM Required
                                    </span>
                                )}
                                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${category.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                                    {category.active ? 'Active' : 'Disabled'}
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
                                Edit
                            </Button>
                            <Button
                                variant={category.active ? 'outline' : 'default'}
                                size="sm"
                                onClick={() => handleToggleActive(category)}
                                className={`flex-1 ${!category.active ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                                data-testid={`toggle-category-${category.id}`}
                            >
                                {category.active ? 'Disable' : 'Enable'}
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {categories.length === 0 && (
                <Card className="p-12 text-center">
                    <Ticket className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Categories Yet</h3>
                    <p className="text-slate-600 mb-4">Create your first ticket category to get started</p>
                    <Button
                        onClick={() => setShowForm(true)}
                        className="bg-slate-900 hover:bg-slate-800"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Category
                    </Button>
                </Card>
            )}
        </div>
    );
};

export default CategoryManagement;
