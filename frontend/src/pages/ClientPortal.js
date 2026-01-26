import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyInfo, getMyProgress, createSession, getTimeSlots, getAvailableSlots } from '../lib/api';
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
  Mail,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertCircle,
  ChevronRight
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

const LOGO_URL = "https://customer-assets.emergentagent.com/job_45d77d8f-2afe-4a7b-9bc9-afe465e1f07c/artifacts/1z71m00b_IMG-20260123-WA0036.jpg";

export default function ClientPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [clientInfo, setClientInfo] = useState(null);
  const [progress, setProgress] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [availableSlots, setAvailableSlots] = useState({});
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

  useEffect(() => {
    if (sessionForm.date) {
      fetchAvailableSlots(sessionForm.date);
    }
  }, [sessionForm.date]);

  const fetchData = async () => {
    try {
      const [infoRes, progressRes, slotsRes] = await Promise.all([
        getMyInfo(),
        getMyProgress(),
        getTimeSlots()
      ]);
      setClientInfo(infoRes.data);
      setProgress(progressRes.data);
      setTimeSlots(slotsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      if (error.response?.status === 404) {
        toast.error('No se encontró tu perfil de cliente');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableSlots = async (date) => {
    try {
      const response = await getAvailableSlots(date);
      setAvailableSlots(response.data);
    } catch (error) {
      console.error('Error fetching available slots:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/cliente');
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

  const getLatestMeasurement = () => {
    if (!progress?.measurements?.length) return null;
    return progress.measurements[progress.measurements.length - 1];
  };

  const getMeasurementChange = (field) => {
    if (!progress?.measurements || progress.measurements.length < 2) return null;
    const latest = progress.measurements[progress.measurements.length - 1];
    const previous = progress.measurements[progress.measurements.length - 2];
    if (!latest[field] || !previous[field]) return null;
    return latest[field] - previous[field];
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

  const latestMeasurement = getLatestMeasurement();
  const availableTimes = Object.keys(availableSlots);

  return (
    <div className="min-h-screen bg-pf-background" data-testid="client-portal">
      {/* Header */}
      <header className="bg-pf-surface border-b border-pf-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between p-4">
          <img src={LOGO_URL} alt="Pump Fit" className="h-10" />
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium">{user?.name}</p>
              <p className="text-pf-text-secondary text-xs">{user?.email}</p>
            </div>
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

      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* Welcome & Quick Stats */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-unbounded text-2xl md:text-3xl text-white">
              ¡Hola, {clientInfo.name.split(' ')[0]}!
            </h1>
            <p className="text-pf-text-secondary mt-1">Bienvenido a tu portal personal</p>
          </div>
          
          {clientInfo.active_packages?.length > 0 && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="btn-primary h-12" data-testid="portal-schedule-btn">
                  <Plus size={20} className="mr-2" />
                  Agendar Sesión
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card border-pf-border">
                <DialogHeader>
                  <DialogTitle className="font-unbounded text-white">Agendar Nueva Sesión</DialogTitle>
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

                  <div className="space-y-2">
                    <Label className="text-pf-text-secondary">Fecha</Label>
                    <Input
                      type="date"
                      value={sessionForm.date}
                      onChange={(e) => setSessionForm({...sessionForm, date: e.target.value, time: '', suit_number: ''})}
                      className="input-dark"
                      min={format(new Date(), 'yyyy-MM-dd')}
                      data-testid="portal-date-input"
                    />
                  </div>

                  {sessionForm.date && (
                    <div className="space-y-2">
                      <Label className="text-pf-text-secondary">Horario Disponible</Label>
                      {availableTimes.length === 0 ? (
                        <p className="text-pf-error text-sm">No hay horarios disponibles para esta fecha</p>
                      ) : (
                        <Select
                          value={sessionForm.time}
                          onValueChange={(value) => setSessionForm({...sessionForm, time: value, suit_number: ''})}
                        >
                          <SelectTrigger className="input-dark" data-testid="portal-time-select">
                            <SelectValue placeholder="Seleccionar hora" />
                          </SelectTrigger>
                          <SelectContent className="bg-pf-surface border-pf-border max-h-60">
                            {availableTimes.map((slot) => (
                              <SelectItem key={slot} value={slot} className="text-white hover:bg-pf-primary/20 font-mono">
                                {slot} ({availableSlots[slot]?.length} trajes disponibles)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {sessionForm.time && availableSlots[sessionForm.time] && (
                    <div className="space-y-2">
                      <Label className="text-pf-text-secondary">Traje</Label>
                      <Select
                        value={sessionForm.suit_number}
                        onValueChange={(value) => setSessionForm({...sessionForm, suit_number: value})}
                      >
                        <SelectTrigger className="input-dark" data-testid="portal-suit-select">
                          <SelectValue placeholder="Seleccionar traje" />
                        </SelectTrigger>
                        <SelectContent className="bg-pf-surface border-pf-border">
                          {availableSlots[sessionForm.time]?.map((num) => (
                            <SelectItem key={num} value={String(num)} className="text-white hover:bg-pf-primary/20">
                              Traje {num}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

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
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card p-4 text-center">
            <CheckCircle className="mx-auto text-pf-secondary mb-2" size={24} />
            <p className="text-2xl font-unbounded text-white">
              {progress?.completed_sessions || 0}
            </p>
            <p className="text-pf-text-secondary text-xs">Sesiones Completadas</p>
          </Card>
          <Card className="glass-card p-4 text-center">
            <Clock className="mx-auto text-pf-primary mb-2" size={24} />
            <p className="text-2xl font-unbounded text-white">
              {clientInfo.upcoming_sessions?.length || 0}
            </p>
            <p className="text-pf-text-secondary text-xs">Próximas Sesiones</p>
          </Card>
          <Card className="glass-card p-4 text-center">
            <Package className="mx-auto text-pf-warning mb-2" size={24} />
            <p className="text-2xl font-unbounded text-white">
              {progress?.remaining_sessions || 0}
            </p>
            <p className="text-pf-text-secondary text-xs">Sesiones Restantes</p>
          </Card>
          <Card className="glass-card p-4 text-center">
            <TrendingUp className="mx-auto text-green-500 mb-2" size={24} />
            <p className="text-2xl font-unbounded text-white">
              {progress?.measurements?.length || 0}
            </p>
            <p className="text-pf-text-secondary text-xs">Mediciones</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sessions" className="space-y-6">
          <TabsList className="bg-pf-surface border border-pf-border w-full justify-start overflow-x-auto">
            <TabsTrigger value="sessions" className="data-[state=active]:bg-pf-primary data-[state=active]:text-white">
              <Calendar size={16} className="mr-2" />Sesiones
            </TabsTrigger>
            <TabsTrigger value="progress" className="data-[state=active]:bg-pf-primary data-[state=active]:text-white">
              <TrendingUp size={16} className="mr-2" />Mi Progreso
            </TabsTrigger>
            <TabsTrigger value="packages" className="data-[state=active]:bg-pf-primary data-[state=active]:text-white">
              <Package size={16} className="mr-2" />Paquetes
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-pf-primary data-[state=active]:text-white">
              <User size={16} className="mr-2" />Perfil
            </TabsTrigger>
          </TabsList>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-6">
            {/* Upcoming Sessions */}
            <Card className="glass-card p-6">
              <h2 className="font-unbounded text-lg text-white mb-4 flex items-center gap-2">
                <Clock className="text-pf-primary" size={20} />
                Próximas Sesiones
              </h2>
              {clientInfo.upcoming_sessions?.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto text-pf-text-secondary mb-3" size={40} />
                  <p className="text-pf-text-secondary">No tienes sesiones programadas</p>
                  {clientInfo.active_packages?.length > 0 && (
                    <Button onClick={() => setDialogOpen(true)} className="btn-primary mt-4">
                      <Plus size={18} className="mr-2" />Agendar Ahora
                    </Button>
                  )}
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
                          <p className="text-white font-mono text-lg">{session.date}</p>
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

            {/* Session History */}
            <Card className="glass-card p-6">
              <h2 className="font-unbounded text-lg text-white mb-4 flex items-center gap-2">
                <Activity className="text-pf-secondary" size={20} />
                Historial de Sesiones
              </h2>
              {clientInfo.session_history?.length === 0 ? (
                <p className="text-pf-text-secondary text-center py-4">Sin historial de sesiones</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {clientInfo.session_history?.slice(0, 10).map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-3 bg-pf-background rounded-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          session.status === 'completed' ? 'bg-pf-secondary/20' :
                          session.status === 'cancelled' ? 'bg-pf-error/20' :
                          'bg-pf-primary/20'
                        }`}>
                          {session.status === 'completed' ? (
                            <CheckCircle className="text-pf-secondary" size={16} />
                          ) : session.status === 'cancelled' ? (
                            <AlertCircle className="text-pf-error" size={16} />
                          ) : (
                            <Clock className="text-pf-primary" size={16} />
                          )}
                        </div>
                        <div>
                          <p className="text-white text-sm font-mono">{session.date} - {session.time}</p>
                          <p className="text-pf-text-secondary text-xs">Traje {session.suit_number}</p>
                        </div>
                      </div>
                      <Badge className={
                        session.status === 'completed' ? 'badge-active' :
                        session.status === 'cancelled' ? 'badge-error' :
                        'badge-pending'
                      }>
                        {session.status === 'completed' ? 'Completada' :
                         session.status === 'cancelled' ? 'Cancelada' :
                         'Programada'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            {/* Latest Measurements */}
            <Card className="glass-card p-6">
              <h2 className="font-unbounded text-lg text-white mb-4 flex items-center gap-2">
                <TrendingUp className="text-pf-primary" size={20} />
                Mis Medidas Actuales
              </h2>
              {!latestMeasurement ? (
                <div className="text-center py-8">
                  <Activity className="mx-auto text-pf-text-secondary mb-3" size={40} />
                  <p className="text-pf-text-secondary">Aún no tienes medidas registradas</p>
                  <p className="text-pf-text-secondary text-sm mt-1">
                    Pide a tu entrenador que registre tus medidas
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {latestMeasurement.weight && (
                    <div className="bg-pf-surface p-4 rounded-sm">
                      <p className="text-pf-text-secondary text-xs uppercase">Peso</p>
                      <p className="text-2xl font-mono text-white">{latestMeasurement.weight} <span className="text-sm">kg</span></p>
                      {getMeasurementChange('weight') !== null && (
                        <p className={`text-xs ${getMeasurementChange('weight') < 0 ? 'text-green-500' : 'text-pf-warning'}`}>
                          {getMeasurementChange('weight') > 0 ? '+' : ''}{getMeasurementChange('weight').toFixed(1)} kg
                        </p>
                      )}
                    </div>
                  )}
                  {latestMeasurement.chest && (
                    <div className="bg-pf-surface p-4 rounded-sm">
                      <p className="text-pf-text-secondary text-xs uppercase">Pecho</p>
                      <p className="text-2xl font-mono text-white">{latestMeasurement.chest} <span className="text-sm">cm</span></p>
                      {getMeasurementChange('chest') !== null && (
                        <p className={`text-xs ${getMeasurementChange('chest') > 0 ? 'text-green-500' : 'text-pf-warning'}`}>
                          {getMeasurementChange('chest') > 0 ? '+' : ''}{getMeasurementChange('chest').toFixed(1)} cm
                        </p>
                      )}
                    </div>
                  )}
                  {latestMeasurement.waist && (
                    <div className="bg-pf-surface p-4 rounded-sm">
                      <p className="text-pf-text-secondary text-xs uppercase">Cintura</p>
                      <p className="text-2xl font-mono text-white">{latestMeasurement.waist} <span className="text-sm">cm</span></p>
                      {getMeasurementChange('waist') !== null && (
                        <p className={`text-xs ${getMeasurementChange('waist') < 0 ? 'text-green-500' : 'text-pf-warning'}`}>
                          {getMeasurementChange('waist') > 0 ? '+' : ''}{getMeasurementChange('waist').toFixed(1)} cm
                        </p>
                      )}
                    </div>
                  )}
                  {latestMeasurement.hips && (
                    <div className="bg-pf-surface p-4 rounded-sm">
                      <p className="text-pf-text-secondary text-xs uppercase">Cadera</p>
                      <p className="text-2xl font-mono text-white">{latestMeasurement.hips} <span className="text-sm">cm</span></p>
                      {getMeasurementChange('hips') !== null && (
                        <p className={`text-xs ${getMeasurementChange('hips') < 0 ? 'text-green-500' : 'text-pf-warning'}`}>
                          {getMeasurementChange('hips') > 0 ? '+' : ''}{getMeasurementChange('hips').toFixed(1)} cm
                        </p>
                      )}
                    </div>
                  )}
                  {latestMeasurement.arm && (
                    <div className="bg-pf-surface p-4 rounded-sm">
                      <p className="text-pf-text-secondary text-xs uppercase">Brazo</p>
                      <p className="text-2xl font-mono text-white">{latestMeasurement.arm} <span className="text-sm">cm</span></p>
                      {getMeasurementChange('arm') !== null && (
                        <p className={`text-xs ${getMeasurementChange('arm') > 0 ? 'text-green-500' : 'text-pf-warning'}`}>
                          {getMeasurementChange('arm') > 0 ? '+' : ''}{getMeasurementChange('arm').toFixed(1)} cm
                        </p>
                      )}
                    </div>
                  )}
                  {latestMeasurement.thigh && (
                    <div className="bg-pf-surface p-4 rounded-sm">
                      <p className="text-pf-text-secondary text-xs uppercase">Muslo</p>
                      <p className="text-2xl font-mono text-white">{latestMeasurement.thigh} <span className="text-sm">cm</span></p>
                      {getMeasurementChange('thigh') !== null && (
                        <p className={`text-xs ${getMeasurementChange('thigh') > 0 ? 'text-green-500' : 'text-pf-warning'}`}>
                          {getMeasurementChange('thigh') > 0 ? '+' : ''}{getMeasurementChange('thigh').toFixed(1)} cm
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              {latestMeasurement && (
                <p className="text-pf-text-secondary text-xs mt-4">
                  Última medición: {new Date(latestMeasurement.date).toLocaleDateString('es-MX')}
                </p>
              )}
            </Card>

            {/* Measurement History */}
            {progress?.measurements?.length > 1 && (
              <Card className="glass-card p-6">
                <h2 className="font-unbounded text-lg text-white mb-4">Historial de Medidas</h2>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {progress.measurements.slice().reverse().map((m, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-pf-surface rounded-sm">
                      <span className="text-pf-primary font-mono text-sm">
                        {new Date(m.date).toLocaleDateString('es-MX')}
                      </span>
                      <div className="flex gap-4 text-sm">
                        {m.weight && <span className="text-white">{m.weight} kg</span>}
                        {m.waist && <span className="text-pf-text-secondary">Cintura: {m.waist}cm</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Medical Notes */}
            {progress?.medical_history?.notes && (
              <Card className="glass-card p-6">
                <h2 className="font-unbounded text-lg text-white mb-4 flex items-center gap-2">
                  <AlertCircle className="text-pf-warning" size={20} />
                  Notas Médicas
                </h2>
                <p className="text-pf-text-secondary">{progress.medical_history.notes}</p>
              </Card>
            )}
          </TabsContent>

          {/* Packages Tab */}
          <TabsContent value="packages" className="space-y-4">
            {clientInfo.active_packages?.length === 0 ? (
              <Card className="glass-card p-8 text-center">
                <Package className="mx-auto text-pf-text-secondary mb-4" size={48} />
                <p className="text-pf-text-secondary">No tienes paquetes activos</p>
                <p className="text-pf-text-secondary text-sm mt-1">
                  Contacta a recepción para adquirir uno
                </p>
              </Card>
            ) : (
              clientInfo.active_packages?.map((pkg) => (
                <Card key={pkg.id} className="glass-card p-6" data-testid={`portal-package-${pkg.id}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-white font-unbounded text-lg">
                        Paquete de {pkg.total_sessions} Sesiones
                      </h3>
                      <p className="text-pf-text-secondary text-sm">
                        {pkg.remaining_sessions} sesiones restantes
                      </p>
                    </div>
                    <Badge className="badge-active">Activo</Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-pf-text-secondary">Progreso</span>
                        <span className="text-white">
                          {pkg.total_sessions - pkg.remaining_sessions} / {pkg.total_sessions}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-bar-fill" 
                          style={{ width: `${((pkg.total_sessions - pkg.remaining_sessions) / pkg.total_sessions) * 100}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm pt-2 border-t border-pf-border">
                      <span className="text-pf-text-secondary">Reagendamientos usados</span>
                      <span className={pkg.used_reschedules >= pkg.max_reschedules ? 'text-pf-error' : 'text-white'}>
                        {pkg.used_reschedules} / {pkg.max_reschedules}
                      </span>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="glass-card p-6">
              <h2 className="font-unbounded text-lg text-white mb-6">Mi Información</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-pf-surface rounded-sm">
                  <User className="text-pf-primary" size={24} />
                  <div>
                    <p className="text-pf-text-secondary text-sm">Nombre</p>
                    <p className="text-white text-lg">{clientInfo.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-pf-surface rounded-sm">
                  <Mail className="text-pf-primary" size={24} />
                  <div>
                    <p className="text-pf-text-secondary text-sm">Email</p>
                    <p className="text-white">{clientInfo.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-pf-surface rounded-sm">
                  <Phone className="text-pf-primary" size={24} />
                  <div>
                    <p className="text-pf-text-secondary text-sm">Teléfono</p>
                    <p className="text-white">{clientInfo.phone}</p>
                  </div>
                </div>
                {clientInfo.birth_date && (
                  <div className="flex items-center gap-4 p-4 bg-pf-surface rounded-sm">
                    <Calendar className="text-pf-primary" size={24} />
                    <div>
                      <p className="text-pf-text-secondary text-sm">Fecha de Nacimiento</p>
                      <p className="text-white">{clientInfo.birth_date}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 p-4 bg-pf-primary/10 rounded-sm border border-pf-primary/20">
                <p className="text-pf-primary text-sm">
                  Para actualizar tu información, contacta a recepción.
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-pf-surface border-t border-pf-border p-4 mt-8">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-pf-text-secondary text-sm">
            © 2025 Pump Fit Electro Stimulation Club
          </p>
        </div>
      </footer>
    </div>
  );
}
