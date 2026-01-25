import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getClients, createClient } from '../lib/api';
import { 
  Search, 
  Plus, 
  User,
  Phone,
  Mail,
  ChevronRight,
  X
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { toast } from 'sonner';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birth_date: '',
    emergency_contact: '',
    emergency_phone: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchClients = async (searchTerm = '') => {
    try {
      const response = await getClients(searchTerm);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await createClient(formData);
      toast.success('Cliente creado exitosamente');
      setDialogOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        birth_date: '',
        emergency_contact: '',
        emergency_phone: ''
      });
      fetchClients();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="clients-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-unbounded text-2xl md:text-3xl text-white">Clientes</h1>
          <p className="text-pf-text-secondary mt-1">
            {clients.length} clientes registrados
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary" data-testid="add-client-btn">
              <Plus size={18} className="mr-2" />
              Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-pf-border max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-unbounded text-xl text-white">
                Nuevo Cliente
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-pf-text-secondary">Nombre Completo *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input-dark"
                    required
                    data-testid="client-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-pf-text-secondary">Teléfono *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="input-dark"
                    required
                    data-testid="client-phone-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-pf-text-secondary">Correo Electrónico *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="input-dark"
                  required
                  data-testid="client-email-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-pf-text-secondary">Fecha de Nacimiento</Label>
                <Input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({...formData, birth_date: e.target.value})}
                  className="input-dark"
                  data-testid="client-birthdate-input"
                />
              </div>

              <div className="border-t border-pf-border pt-4 mt-4">
                <p className="text-pf-primary text-sm font-medium mb-3">Contacto de Emergencia</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-pf-text-secondary">Nombre</Label>
                    <Input
                      value={formData.emergency_contact}
                      onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                      className="input-dark"
                      data-testid="client-emergency-contact-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-pf-text-secondary">Teléfono</Label>
                    <Input
                      value={formData.emergency_phone}
                      onChange={(e) => setFormData({...formData, emergency_phone: e.target.value})}
                      className="input-dark"
                      data-testid="client-emergency-phone-input"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDialogOpen(false)}
                  className="btn-ghost"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  data-testid="save-client-btn"
                >
                  {saving ? 'Guardando...' : 'Crear Cliente'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-pf-text-secondary" size={20} />
        <Input
          placeholder="Buscar por nombre, email o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-dark pl-12"
          data-testid="search-clients"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-pf-text-secondary hover:text-white"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Clients Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-40 skeleton rounded-sm" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <User className="mx-auto text-pf-text-secondary mb-4" size={48} />
          <h3 className="text-white font-medium mb-2">
            {search ? 'No se encontraron clientes' : 'Sin clientes registrados'}
          </h3>
          <p className="text-pf-text-secondary mb-4">
            {search 
              ? 'Intenta con otra búsqueda' 
              : 'Comienza agregando tu primer cliente'}
          </p>
          {!search && (
            <Button 
              className="btn-primary"
              onClick={() => setDialogOpen(true)}
            >
              <Plus size={18} className="mr-2" />
              Agregar Cliente
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Link 
              key={client.id} 
              to={`/clients/${client.id}`}
              data-testid={`client-card-${client.id}`}
            >
              <Card className="glass-card p-5 hover:border-pf-primary/50 transition-all cursor-pointer group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-pf-primary/20 flex items-center justify-center">
                      <User className="text-pf-primary" size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-medium group-hover:text-pf-primary transition-colors">
                        {client.name}
                      </h3>
                      <Badge className={client.is_active ? 'badge-active' : 'badge-error'}>
                        {client.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight 
                    className="text-pf-text-secondary group-hover:text-pf-primary transition-colors" 
                    size={20} 
                  />
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-pf-text-secondary text-sm">
                    <Mail size={14} />
                    <span className="truncate">{client.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-pf-text-secondary text-sm">
                    <Phone size={14} />
                    <span>{client.phone}</span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
