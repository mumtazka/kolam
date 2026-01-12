import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Plus, Edit, UserX, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { getUsers, createUser, updateUser, deactivateUser, activateUser } from '../../services/userService';
import { useLanguage } from '../../contexts/LanguageContext';

const UserManagement = () => {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'RECEPTIONIST'
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

  const handleDeactivate = async (userId, currentStatus) => {
    if (window.confirm(t('admin.confirmStatusChange'))) {
      try {
        if (currentStatus) {
          await deactivateUser(userId);
          toast.success(t('admin.userDeactivated'));
        } else {
          await activateUser(userId);
          toast.success(t('admin.userActivated'));
        }
        fetchUsers();
      } catch (error) {
        toast.error(t('common.error'));
      }
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'ADMIN': return t('admin.roleAdmin');
      case 'RECEPTIONIST': return t('admin.roleReceptionist');
      case 'SCANNER': return t('admin.roleScanner');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900" style={{ fontFamily: 'Outfit' }}>{t('admin.staffManagement')}</h1>
          <p className="text-slate-600 mt-1">{t('admin.usersSubtitle')}</p>
        </div>
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
                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'RECEPTIONIST' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
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
                      {user.role !== 'ADMIN' && (
                        <Button
                          size="sm"
                          variant={user.is_active ? "destructive" : "default"}
                          onClick={() => handleDeactivate(user.id, user.is_active)}
                          data-testid={`deactivate-user-${user.id}`}
                          className={!user.is_active ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                        >
                          {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </Button>
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
        <DialogContent data-testid="user-form-dialog">
          <DialogHeader>
            <DialogTitle>{editingUser ? t('admin.editStaff') : t('admin.addStaff')}</DialogTitle>
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
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger data-testid="user-role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">{t('admin.roleAdmin')}</SelectItem>
                  <SelectItem value="RECEPTIONIST">{t('admin.roleReceptionist')}</SelectItem>
                  <SelectItem value="SCANNER">{t('admin.roleScanner')}</SelectItem>
                </SelectContent>
              </Select>
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
    </div>
  );
};

export default UserManagement;