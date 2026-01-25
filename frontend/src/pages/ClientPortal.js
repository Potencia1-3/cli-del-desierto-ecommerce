import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyInfo, createSession, getTimeSlots } from '../lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  User, 
  Calendar, 
  Package, 
  LogOut,
  Clock,
  Plus,
  Phone,
  Mail
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_45d77d8f-2afe-4a7b-9bc9-afe465e1f07c/artifacts/1z71m00b_IMG-20260123-WA0036.jpg";

export default function ClientPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [clientInfo, setClientInfo] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [sessionForm, setSessionForm] = useState({
    package_id: '',
    date: '',
    time: '',
    suit_number: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [infoRes, slotsRes] = await Promise.all([
        getMyInfo(),
        getTimeSlots()
      ]);
      setClientInfo(infoRes.data);
      setTimeSlots(slotsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('No se encontró tu perfil de cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateSession = async () => {
    if (!clientInfo) return;
    
    setSaving(true);
    try {
      await createSession({
        client_id: clientInfo.id,
        package_id: sessionForm.package_id,
        date: sessionForm.date,
        time: sessionForm.time,
        suit_number: parseInt(sessionForm.suit_number)
      });
      toast.success('¡Sesión agendada exitosamente!');
      setDialogOpen(false);
      setSessionForm({ package_id: '', date: '', time: '', suit_number: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al agendar sesión');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pf-background flex items-center justify-center">
        <div className="animate-pulse-neon w-16 h-16 rounded-full bg-pf-primary/20" />
      </div>
    );
  }

  if (!clientInfo) {
    return (
      <div className="min-h-screen bg-pf-background flex items-center justify-center p-4">
        <Card className="glass-card p-8 max-w-md text-center">
          <User className="mx-auto text-pf-text-secondary mb-4" size={48} />
          <h2 className="font-unbounded text-xl text-white mb-2">Perfil no encontrado</h2>
          <p className="text-pf-text-secondary mb-6">
            Tu cuenta de cliente aún no está vinculada. Contacta al administrador.
          </p>
          <Button onClick={handleLogout} className="btn-outline">
            <LogOut size={18} className="mr-2" />
            Cerrar Sesión
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pf-background" data-testid="client-portal">
      {/* Header */}
      <header className="bg-pf-surface border-b border-pf-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <img src={LOGO_URL} alt="Pump Fit" className="h-10" />
          <div className="flex items-center gap-4">
            <span className="text-pf-text-secondary text-sm hidden sm:inline">
              {user?.name}
            </span>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              className="text-pf-error hover:bg-pf-error/10"
              data-testid="portal-logout-btn"
            >
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        {/* Welcome */}
        <div className="text-center py-6">
          <h1 className="font-unbounded text-2xl md:text-3xl text-white mb-2">
            ¡Hola, {clientInfo.name.split(' ')[0]}!
          </h1>
          <p className="text-pf-text-secondary">
            Bienvenido a tu portal de Pump Fit
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card p-4 text-center">
            <Package className="mx-auto text-pf-primary mb-2" size={24} />
            <p className="text-2xl font-unbounded text-white">
              {clientInfo.active_packages?.length || 0}
            </p>
            <p className="text-pf-text-secondary text-xs">Paquetes Activos</p>
          </Card>
          <Card className="glass-card p-4 text-center">
            <Calendar className="mx-auto text-pf-secondary mb-2" size={24} />
            <p className="text-2xl font-unbounded text-white">
              {clientInfo.upcoming_sessions?.length || 0}
            </p>
            <p className="text-pf-text-secondary text-xs">Próximas Sesiones</p>
          </Card>
          <Card className="glass-card p-4 text-center">
            <Clock className="mx-auto text-pf-warning mb-2" size={24} />
            <p className="text-2xl font-unbounded text-white">
              {clientInfo.active_packages?.reduce((acc, p) => acc + p.remaining_sessions, 0) || 0}
            </p>
            <p className="text-pf-text-secondary text-xs">Sesiones Restantes</p>
          </Card>
          <Card className="glass-card p-4 text-center">
            <User className="mx-auto text-green-500 mb-2" size={24} />
            <p className="text-2xl font-unbounded text-white">
              {clientInfo.measurements?.length || 0}
            </p>
            <p className="text-pf-text-secondary text-xs">Mediciones</p>
          </Card>
        </div>

        {/* Schedule Session Button */}
        {clientInfo.active_packages?.length > 0 && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full btn-primary h-14 text-lg" data-testid="portal-schedule-btn">
                <Plus size={24} className="mr-2" />
                Agendar Nueva Sesión
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-pf-border">
              <DialogHeader>
                <DialogTitle className="font-unbounded text-white">Agendar Sesión</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-pf-text-secondary">Paquete</Label>
                  <Select
                    value={sessionForm.package_id}
                    onValueChange={(value) => setSessionForm({...sessionForm, package_id: value})}
                  >
                    <SelectTrigger className="input-dark" data-testid="portal-package-select">
                      <SelectValue placeholder="Seleccionar paquete" />
                    </SelectTrigger>
                    <SelectContent className="bg-pf-surface border-pf-border">
                      {clientInfo.active_packages?.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id} className="text-white hover:bg-pf-primary/20">
                          {pkg.total_sessions} sesiones - {pkg.remaining_sessions} restantes
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-pf-text-secondary">Fecha</Label>
                    <Input
                      type="date"
                      value={sessionForm.date}
                      onChange={(e) => setSessionForm({...sessionForm, date: e.target.value})}
                      className="input-dark"
                      min={format(new Date(), 'yyyy-MM-dd')}
                      data-testid="portal-date-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-pf-text-secondary">Hora</Label>
                    <Select
                      value={sessionForm.time}
                      onValueChange={(value) => setSessionForm({...sessionForm, time: value})}
                    >
                      <SelectTrigger className="input-dark" data-testid="portal-time-select">
                        <SelectValue placeholder="Hora" />
                      </SelectTrigger>
                      <SelectContent className="bg-pf-surface border-pf-border max-h-60">
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot} value={slot} className="text-white hover:bg-pf-primary/20 font-mono">
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-pf-text-secondary">Traje Preferido</Label>
                  <Select
                    value={sessionForm.suit_number}
                    onValueChange={(value) => setSessionForm({...sessionForm, suit_number: value})}
                  >
                    <SelectTrigger className="input-dark" data-testid="portal-suit-select">
                      <SelectValue placeholder="Seleccionar traje" />
                    </SelectTrigger>
                    <SelectContent className="bg-pf-surface border-pf-border">
                      {[1, 2, 3, 4, 5, 6].map((num) => (
                        <SelectItem key={num} value={String(num)} className="text-white hover:bg-pf-primary/20">
                          Traje {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-pf-text-secondary text-xs">
                  * Recuerda que puedes agendar máximo 2 sesiones por semana
                </p>

                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="ghost" onClick={() => setDialogOpen(false)} className="btn-ghost">
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreateSession} 
                    className="btn-primary" 
                    disabled={saving || !sessionForm.package_id || !sessionForm.date || !sessionForm.time || !sessionForm.suit_number}
                    data-testid="portal-save-session-btn"
                  >
                    {saving ? 'Agendando...' : 'Confirmar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Upcoming Sessions */}
        <Card className="glass-card p-6">
          <h2 className="font-unbounded text-lg text-white mb-4">
            Próximas Sesiones
          </h2>
          {clientInfo.upcoming_sessions?.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="mx-auto text-pf-text-secondary mb-3" size={40} />
              <p className="text-pf-text-secondary">No tienes sesiones programadas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientInfo.upcoming_sessions?.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-pf-surface rounded-sm border border-pf-border"
                  data-testid={`portal-session-${session.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-sm bg-pf-primary/10 flex items-center justify-center">
                      <Clock className="text-pf-primary" size={20} />
                    </div>
                    <div>
                      <p className="text-white font-mono">{session.date}</p>
                      <p className="text-pf-text-secondary text-sm">
                        {session.time} • Traje {session.suit_number}
                      </p>
                    </div>
                  </div>
                  <Badge className={session.is_reschedule ? 'badge-pending' : 'badge-active'}>
                    {session.is_reschedule ? 'Reagendada' : 'Confirmada'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Active Packages */}
        <Card className="glass-card p-6">
          <h2 className="font-unbounded text-lg text-white mb-4">
            Mis Paquetes
          </h2>
          {clientInfo.active_packages?.length === 0 ? (
            <div className="text-center py-6">
              <Package className="mx-auto text-pf-text-secondary mb-3" size={40} />
              <p className="text-pf-text-secondary">No tienes paquetes activos</p>
              <p className="text-pf-text-secondary text-sm mt-1">
                Contacta a recepción para adquirir uno
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {clientInfo.active_packages?.map((pkg) => (
                <div key={pkg.id} className="p-4 bg-pf-surface rounded-sm border border-pf-border" data-testid={`portal-package-${pkg.id}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-white font-medium">
                        Paquete de {pkg.total_sessions} Sesiones
                      </p>
                      <p className="text-pf-text-secondary text-sm">
                        {pkg.remaining_sessions} sesiones restantes
                      </p>
                    </div>
                    <Badge className="badge-active">Activo</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="progress-bar">
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${((pkg.total_sessions - pkg.remaining_sessions) / pkg.total_sessions) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-pf-text-secondary">
                      <span>{pkg.total_sessions - pkg.remaining_sessions} usadas</span>
                      <span>Reagendamientos: {pkg.used_reschedules}/{pkg.max_reschedules}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Contact Info */}
        <Card className="glass-card p-6">
          <h2 className="font-unbounded text-lg text-white mb-4">
            Mi Información
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="text-pf-primary" size={20} />
              <div>
                <p className="text-pf-text-secondary text-sm">Nombre</p>
                <p className="text-white">{clientInfo.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="text-pf-primary" size={20} />
              <div>
                <p className="text-pf-text-secondary text-sm">Email</p>
                <p className="text-white">{clientInfo.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="text-pf-primary" size={20} />
              <div>
                <p className="text-pf-text-secondary text-sm">Teléfono</p>
                <p className="text-white">{clientInfo.phone}</p>
              </div>
            </div>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-pf-surface border-t border-pf-border p-4 mt-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-pf-text-secondary text-sm">
            © 2025 Pump Fit Electro Stimulation Club
          </p>
        </div>
      </footer>
    </div>
  );
}
