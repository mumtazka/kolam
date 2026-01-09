import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit, Trash2, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';
import { getLocations, createLocation, updateLocation, deleteLocation } from '../../services/adminService';

const LocationManagement = () => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        capacity: ''
    });

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const data = await getLocations();
            setLocations(data);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load locations');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const submitData = {
                name: formData.name,
                capacity: formData.capacity ? parseInt(formData.capacity, 10) : null
            };

            if (editingLocation) {
                await updateLocation(editingLocation.id, submitData);
                toast.success('Location updated successfully');
            } else {
                await createLocation(submitData);
                toast.success('Location created successfully');
            }
            setDialogOpen(false);
            setEditingLocation(null);
            resetForm();
            fetchLocations();
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Operation failed');
        }
    };

    const handleDelete = async (locationId) => {
        if (window.confirm('Are you sure you want to delete this location?')) {
            try {
                await deleteLocation(locationId);
                toast.success('Location deleted');
                fetchLocations();
            } catch (error) {
                console.error(error);
                toast.error('Failed to delete location');
            }
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            capacity: ''
        });
    };

    const openEditDialog = (location) => {
        setEditingLocation(location);
        setFormData({
            name: location.name,
            capacity: location.capacity?.toString() || ''
        });
        setDialogOpen(true);
    };

    const openCreateDialog = () => {
        setEditingLocation(null);
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
                    <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>Location Management</h1>
                    <p className="text-slate-600 mt-1">Manage pool locations and capacities</p>
                </div>
                <Button onClick={openCreateDialog} className="bg-slate-900 hover:bg-slate-800" data-testid="create-location-button">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Location
                </Button>
            </div>

            {locations.length === 0 ? (
                <Card className="p-12 text-center">
                    <MapPin className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No Locations</h3>
                    <p className="text-slate-600 mb-4">Create your first location to get started</p>
                    <Button onClick={openCreateDialog} className="bg-slate-900 hover:bg-slate-800">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Location
                    </Button>
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Location Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Capacity</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Created</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {locations.map((location) => (
                                    <tr key={location.id} className="hover:bg-slate-50" data-testid={`location-row-${location.id}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center mr-3">
                                                    <MapPin className="w-4 h-4 text-sky-600" />
                                                </div>
                                                <span className="text-sm text-slate-900 font-medium">{location.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {location.capacity ? (
                                                <span className="inline-flex items-center text-sm text-slate-600">
                                                    <Users className="w-4 h-4 mr-1 text-slate-400" />
                                                    {location.capacity} people
                                                </span>
                                            ) : (
                                                <span className="text-sm text-slate-400">Not set</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {new Date(location.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex space-x-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEditDialog(location)}
                                                    data-testid={`edit-location-${location.id}`}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDelete(location.id)}
                                                    data-testid={`delete-location-${location.id}`}
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
                <DialogContent data-testid="location-form-dialog">
                    <DialogHeader>
                        <DialogTitle>{editingLocation ? 'Edit Location' : 'Add New Location'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="name">Location Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Main Pool, Kids Pool"
                                required
                                data-testid="location-name-input"
                            />
                        </div>

                        <div>
                            <Label htmlFor="capacity">Capacity (Optional)</Label>
                            <Input
                                id="capacity"
                                type="number"
                                min="1"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                placeholder="e.g., 50"
                                data-testid="location-capacity-input"
                            />
                            <p className="text-xs text-slate-500 mt-1">Maximum number of people allowed</p>
                        </div>

                        <div className="flex space-x-2 pt-4">
                            <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800" data-testid="location-form-submit">
                                {editingLocation ? 'Update' : 'Create'}
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

export default LocationManagement;
