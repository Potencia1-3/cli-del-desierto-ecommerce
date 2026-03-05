import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser, changeUserPassword, getShiftHistory } from '../lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Key,
  Shield,
  Clock,
  DollarSign
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';

const ROLE_LABELS = {
  superadmin: { label: 'Super Admin', color: 'bg-pf-error/20 text-pf-error border-pf-error/30' },
  admin: { label: 'Administrador', color: 'bg-pf-primary/20 text-pf-primary border-pf-primary/30' },
  reception: { label: 'Mostrador', color: 'bg-pf-secondary/20 text-pf-secondary border-pf-secondary/30' }
};

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    password: '',
    role: 'reception'
  });
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, shiftsRes] = await Promise.all([
        getUsers(),
        getShiftHistory()
      ]);
      setUsers(usersRes.data);
      setShifts(shiftsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    setSaving(true);
    try {
      await createUser(formData);
      toast.success('Usuario creado');
      setCreateDialogOpen(false);
      setFormData({ email: '', name: '', phone: '', password: '', role: 'reception' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      await updateUser(selectedUser.id, {
        name: formData.name,
        phone: formData.phone,
        role: formData.role
      });
      toast.success('Usuario actualizado');
      setEditDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      await deleteUser(userId);
      toast.success('Usuario eliminado');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al eliminar');
    }
  };

  const handleChangePassword = async () => {
    if (!selectedUser || !newPassword) return;
    setSaving(true);
    try {
      await changeUserPassword(selectedUser.id, newPassword);
      toast.success('Contraseña actualizada');
      setPasswordDialogOpen(false);
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cambiar contraseña');
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      phone: user.phone || '',
      password: '',
      role: user.role
    });
    setEditDialogOpen(true);
  };

  const openPasswordDialog = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setPasswordDialogOpen(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton rounded" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 skeleton rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="user-management-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-unbounded text-2xl md:text-3xl text-white flex items-center gap-3">
            <Shield className="text-pf-primary" />
            Gestión de Usuarios
          </h1>
          <p className="text-pf-text-secondary mt-1">
            Administra los usuarios del sistema (Solo Super Admin)
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary" data-testid="create-user-btn">
              <Plus size={18} className="mr-2" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-pf-border">
            <DialogHeader>
              <DialogTitle className="font-unbounded text-white">Crear Usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-pf-text-secondary">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="input-dark"
                  data-testid="user-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-pf-text-secondary">Nombre</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-dark"
                  data-testid="user-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-pf-text-secondary">Teléfono</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="input-dark"
                  data-testid="user-phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-pf-text-secondary">Contraseña</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="input-dark"
                  data-testid="user-password-input"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-pf-text-secondary">Rol</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({...formData, role: value})}
                >
                  <SelectTrigger className="input-dark" data-testid="user-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-pf-surface border-pf-border">
                    <SelectItem value="admin" className="text-white hover:bg-pf-primary/20">Administrador</SelectItem>
                    <SelectItem value="reception" className="text-white hover:bg-pf-primary/20">Mostrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <Button variant="ghost" onClick={() => setCreateDialogOpen(false)} className="btn-ghost">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateUser} 
                  className="btn-primary" 
                  disabled={saving || !formData.email || !formData.name || !formData.password}
                  data-testid="save-user-btn"
                >
                  {saving ? 'Creando...' : 'Crear Usuario'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-pf-surface border border-pf-border">
          <TabsTrigger value="users" className="data-[state=active]:bg-pf-primary data-[state=active]:text-white">
            <Users size={16} className="mr-2" />Usuarios
          </TabsTrigger>
          <TabsTrigger value="shifts" className="data-[state=active]:bg-pf-primary data-[state=active]:text-white">
            <Clock size={16} className="mr-2" />Historial de Turnos
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          {users.length === 0 ? (
            <Card className="glass-card p-8 text-center">
              <Users className="mx-auto text-pf-text-secondary mb-4" size={48} />
              <p className="text-pf-text-secondary">Sin usuarios registrados</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <Card key={user.id} className="glass-card p-4" data-testid={`user-card-${user.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-pf-primary/20 flex items-center justify-center">
                        <Shield className="text-pf-primary" size={24} />
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-pf-text-secondary text-sm">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={ROLE_LABELS[user.role]?.color || 'badge-pending'}>
                        {ROLE_LABELS[user.role]?.label || user.role}
                      </Badge>
                      {user.role !== 'superadmin' && (
                        <div className="flex gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-pf-secondary hover:bg-pf-secondary/20"
                            onClick={() => openEditDialog(user)}
                            data-testid={`edit-user-${user.id}`}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-pf-warning hover:bg-pf-warning/20"
                            onClick={() => openPasswordDialog(user)}
                            data-testid={`password-user-${user.id}`}
                          >
                            <Key size={16} />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-pf-error hover:bg-pf-error/20"
                            onClick={() => handleDeleteUser(user.id)}
                            data-testid={`delete-user-${user.id}`}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Shifts Tab */}
        <TabsContent value="shifts" className="space-y-4">
          {shifts.length === 0 ? (
            <Card className="glass-card p-8 text-center">
              <Clock className="mx-auto text-pf-text-secondary mb-4" size={48} />
              <p className="text-pf-text-secondary">Sin historial de turnos</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {shifts.map((shift) => (
                <Card key={shift.id} className={`glass-card p-4 ${shift.status === 'open' ? 'border-green-500/30' : ''}`} data-testid={`shift-card-${shift.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${shift.status === 'open' ? 'bg-green-500/20' : 'bg-pf-surface'}`}>
                        <Clock className={shift.status === 'open' ? 'text-green-500' : 'text-pf-text-secondary'} size={24} />
                      </div>
                      <div>
                        <p className="text-white font-medium">{shift.user_name}</p>
                        <p className="text-pf-text-secondary text-sm">
                          {format(new Date(shift.start_time), "dd/MM/yyyy HH:mm", { locale: es })}
                          {shift.end_time && ` - ${format(new Date(shift.end_time), "HH:mm", { locale: es })}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={shift.status === 'open' ? 'badge-active' : 'bg-pf-surface text-pf-text-secondary border-pf-border'}>
                        {shift.status === 'open' ? 'Abierto' : 'Cerrado'}
                      </Badge>
                      {shift.status === 'closed' && (
                        <div className="mt-2">
                          <p className="text-pf-primary font-mono">{formatCurrency(shift.sales_total)}</p>
                          <p className={`text-xs ${shift.difference === 0 ? 'text-green-500' : shift.difference > 0 ? 'text-pf-secondary' : 'text-pf-error'}`}>
                            Diferencia: {formatCurrency(shift.difference)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {shift.status === 'closed' && (
                    <div className="mt-4 pt-4 border-t border-pf-border grid grid-cols-4 gap-4 text-center text-sm">
                      <div>
                        <p className="text-pf-text-secondary">Inicial</p>
                        <p className="text-white font-mono">{formatCurrency(shift.starting_cash)}</p>
                      </div>
                      <div>
                        <p className="text-pf-text-secondary">Efectivo</p>
                        <p className="text-green-500 font-mono">{formatCurrency(shift.cash_sales)}</p>
                      </div>
                      <div>
                        <p className="text-pf-text-secondary">Tarjeta</p>
                        <p className="text-pf-secondary font-mono">{formatCurrency(shift.card_sales)}</p>
                      </div>
                      <div>
                        <p className="text-pf-text-secondary">Final</p>
                        <p className="text-white font-mono">{formatCurrency(shift.final_cash)}</p>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="glass-card border-pf-border">
          <DialogHeader>
            <DialogTitle className="font-unbounded text-white">Editar Usuario</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-pf-text-secondary">Email</Label>
              <Input value={formData.email} disabled className="input-dark opacity-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-pf-text-secondary">Nombre</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="input-dark"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-pf-text-secondary">Teléfono</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="input-dark"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-pf-text-secondary">Rol</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({...formData, role: value})}
              >
                <SelectTrigger className="input-dark">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-pf-surface border-pf-border">
                  <SelectItem value="admin" className="text-white hover:bg-pf-primary/20">Administrador</SelectItem>
                  <SelectItem value="reception" className="text-white hover:bg-pf-primary/20">Mostrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="ghost" onClick={() => setEditDialogOpen(false)} className="btn-ghost">
                Cancelar
              </Button>
              <Button onClick={handleUpdateUser} className="btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="glass-card border-pf-border">
          <DialogHeader>
            <DialogTitle className="font-unbounded text-white">Cambiar Contraseña</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-pf-text-secondary">
              Cambiar contraseña de: <span className="text-white">{selectedUser?.name}</span>
            </p>
            <div className="space-y-2">
              <Label className="text-pf-text-secondary">Nueva Contraseña</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-dark"
                placeholder="Mínimo 6 caracteres"
                data-testid="new-password-input"
              />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="ghost" onClick={() => setPasswordDialogOpen(false)} className="btn-ghost">
                Cancelar
              </Button>
              <Button 
                onClick={handleChangePassword} 
                className="btn-primary" 
                disabled={saving || newPassword.length < 6}
                data-testid="save-password-btn"
              >
                {saving ? 'Guardando...' : 'Cambiar Contraseña'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
