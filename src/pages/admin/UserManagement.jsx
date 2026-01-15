import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { ConfirmDialog } from '../../components/ui/confirm-dialog';
import { Plus, Edit, UserX, UserCheck, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getUsers, createUser, updateUser, deactivateUser, activateUser, deleteUser } from '../../services/userService';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

const UserManagement = () => {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, userId: null, isActive: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, userId: null, userName: '' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'RECEPTIONIST' // Default role for new users, but shifts determine actual permissions
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
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
      if (editingUser) {
        await updateUser(editingUser.id, formData);
        toast.success(t('common.success'));
      } else {
        await createUser(formData);
        toast.success(t('common.success'));
      }
      setDialogOpen(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'RECEPTIONIST' });
      fetchUsers();
    } catch (error) {
      console.error(error);
      toast.error(error.message || t('common.error'));
    }
  };

  const handleDeactivate = (userId, currentStatus) => {
    setConfirmDialog({ open: true, userId, isActive: currentStatus });
  };

  const confirmDeactivate = async () => {
    const { userId, isActive } = confirmDialog;
    try {
      if (isActive) {
        await deactivateUser(userId);
        toast.success(t('admin.userDeactivated'));
      } else {
        await activateUser(userId);
        toast.success(t('admin.userActivated'));
      }
      fetchUsers();
    } catch (error) {
      toast.error(t('common.error'));
    } finally {
      setConfirmDialog({ open: false, userId: null, isActive: null });
    }
  };

  const handleDeleteUser = (userId, userName) => {
    setDeleteDialog({ open: true, userId, userName });
  };

  const confirmDeleteUser = async () => {
    try {
      await deleteUser(deleteDialog.userId);
      toast.success(t('admin.staffDeleted'));
      fetchUsers();
    } catch (error) {
      console.error(error);
      // Handle foreign key constraint error (user has related data)
      if (error.code === '23503' || (error.message && error.message.includes('foreign key'))) {
        toast.error(
          t('admin.deleteStaffConstraintError'),
          { duration: 6000 }
        );
      } else {
        toast.error(t('admin.deleteStaffError') + ': ' + (error.message || t('common.error')));
      }
    } finally {
      setDeleteDialog({ open: false, userId: null, userName: '' });
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'ADMIN': return t('admin.roleAdmin');
      // Both RECEPTIONIST and SCANNER are displayed as "Staff"
      case 'RECEPTIONIST': return t('admin.roleStaff') || 'Staff';
      case 'SCANNER': return t('admin.roleStaff') || 'Staff';
      default: return role;
    }
  };

  const openEditDialog = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', role: 'RECEPTIONIST' });
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button onClick={openCreateDialog} className="bg-slate-900 hover:bg-slate-800" data-testid="create-user-button">
          <Plus className="w-4 h-4 mr-2" />
          {t('admin.addStaff')}
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">{t('admin.name')}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">{t('auth.email')}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">{t('admin.role')}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">{t('admin.status')}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50" data-testid={`user-row-${user.id}`}>
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_active ? (
                      <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
                        <UserCheck className="w-3 h-3 mr-1" />
                        {t('admin.active')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-700">
                        <UserX className="w-3 h-3 mr-1" />
                        {t('admin.inactive')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(user)}
                        data-testid={`edit-user-${user.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {/* Hide activate/deactivate and delete buttons for the currently logged-in user only */}
                      {user.id !== currentUser?.id && (
                        <>
                          <Button
                            size="sm"
                            variant={user.is_active ? "destructive" : "default"}
                            onClick={() => handleDeactivate(user.id, user.is_active)}
                            data-testid={`deactivate-user-${user.id}`}
                            className={!user.is_active ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                            title={user.is_active ? t('admin.deactivate') : t('admin.activate')}
                          >
                            {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            data-testid={`delete-user-${user.id}`}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 hover:border-red-300"
                            title={t('admin.deletePermanently')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="user-form-dialog" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editingUser ? t('admin.editStaff') : t('admin.addStaff')}</DialogTitle>
            <DialogDescription>
              {editingUser ? t('admin.usersSubtitle') : t('admin.usersSubtitle')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">{t('admin.fullName')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                data-testid="user-name-input"
              />
            </div>
            <div>
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                data-testid="user-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password">{t('auth.password')} {editingUser && `(${t('admin.passwordHint')})`}</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
                data-testid="user-password-input"
              />
            </div>
            <div>
              <Label htmlFor="role">{t('admin.role')}</Label>
              <Select
                value={formData.role === 'SCANNER' ? 'RECEPTIONIST' : formData.role} // Map SCANNER to RECEPTIONIST (Staff) in UI
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger data-testid="user-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">{t('admin.roleAdmin')}</SelectItem>
                  <SelectItem value="RECEPTIONIST">{t('admin.roleStaff') || 'Staff'}</SelectItem>
                </SelectContent>
              </Select>
              {formData.role !== 'ADMIN' && (
                <p className="text-xs text-slate-500 mt-1">
                  {t('shift.roleHint') || 'Staff can work as Cashier or Scanner'}
                </p>
              )}
            </div>
            <div className="flex space-x-2 pt-4">
              <Button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800" data-testid="user-form-submit">
                {editingUser ? t('admin.update') : t('admin.create')}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                {t('common.cancel')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.isActive ? t('admin.deactivateStaffTitle') : t('admin.activateStaffTitle')}
        description={confirmDialog.isActive
          ? t('admin.deactivateStaffConfirm')
          : t('admin.activateStaffConfirm')}
        onConfirm={confirmDeactivate}
        onCancel={() => setConfirmDialog({ open: false, userId: null, isActive: null })}
        confirmText={confirmDialog.isActive ? t('admin.deactivateYes') : t('admin.activateYes')}
        cancelText={t('common.cancel')}
        variant={confirmDialog.isActive ? "warning" : "info"}
      />

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
        title={t('admin.deleteStaffTitle')}
        description={t('admin.deleteStaffConfirm').replace('{{name}}', deleteDialog.userName)}
        onConfirm={confirmDeleteUser}
        onCancel={() => setDeleteDialog({ open: false, userId: null, userName: '' })}
        confirmText={t('admin.deleteYes')}
        cancelText={t('common.cancel')}
        variant="danger"
      />
    </div>
  );
};

export default UserManagement;