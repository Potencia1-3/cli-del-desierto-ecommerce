import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getClient, updateClient, updateMedicalHistory, addMeasurement, createPackage, createSession, getTimeSlots, completeSession, cancelSession, payInscription, addNutritionPlan, activateClient, deactivateClient, getPackageTypes, updateReferralStatus } from '../lib/api';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Calendar,
  Package,
  Activity,
  Plus,
  Save,
  Ruler,
  AlertCircle,
  Check,
  X,
  Clock,
  DollarSign,
  Apple,
  Users,
  Power
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
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

const NUM_SUITS = 2; // Only 2 suits available

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeSlots, setTimeSlots] = useState([]);
  const [packageTypes, setPackageTypes] = useState(null);
  
  // Form states
  const [editInfo, setEditInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({});
  const [medicalForm, setMedicalForm] = useState({
    conditions: [],
    injuries: [],
    medications: [],
    notes: ''
  });
  const [conditionInput, setConditionInput] = useState('');
  const [injuryInput, setInjuryInput] = useState('');
  const [medicationInput, setMedicationInput] = useState('');
  
  // Dialogs
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [measurementDialogOpen, setMeasurementDialogOpen] = useState(false);
  
  // Package form
  const [packageForm, setPackageForm] = useState({
    package_type: '',
    use_promo_price: true,
    notes: ''
  });
  
  // Session form
  const [sessionForm, setSessionForm] = useState({
    package_id: '',
    date: '',
    time: '',
    suit_number: ''
  });
  
  // Measurement form
  const [measurementForm, setMeasurementForm] = useState({
    weight: '',
    height: '',
    chest: '',
    waist: '',
    hips: '',
    arm: '',
    thigh: '',
    notes: ''
  });
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClient();
    fetchTimeSlots();
    fetchPackageTypes();
  }, [id]);

  const fetchClient = async () => {
    try {
      const response = await getClient(id);
      setClient(response.data);
      setInfoForm({
        name: response.data.name,
        phone: response.data.phone,
        birth_date: response.data.birth_date || '',
        emergency_contact: response.data.emergency_contact || '',
        emergency_phone: response.data.emergency_phone || ''
      });
      setMedicalForm({
        conditions: response.data.medical_history?.conditions || [],
        injuries: response.data.medical_history?.injuries || [],
        medications: response.data.medical_history?.medications || [],
        notes: response.data.medical_history?.notes || ''
      });
    } catch (error) {
      toast.error('Error al cargar cliente');
      navigate('/clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const response = await getTimeSlots();
      setTimeSlots(response.data);
    } catch (error) {
      console.error('Error fetching time slots:', error);
    }
  };

  const fetchPackageTypes = async () => {
    try {
      const response = await getPackageTypes();
      setPackageTypes(response.data);
    } catch (error) {
      console.error('Error fetching package types:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handlePayInscription = async () => {
    setSaving(true);
    try {
      await payInscription(id);
      toast.success('Inscripción pagada');
      fetchClient();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al pagar inscripción');
    } finally {
      setSaving(false);
    }
  };

  const handleAddNutritionPlan = async () => {
    setSaving(true);
    try {
      await addNutritionPlan(id);
      toast.success('Plan de nutrición agregado');
      fetchClient();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al agregar plan');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivation = async () => {
    setSaving(true);
    try {
      if (client.profile_active) {
        await deactivateClient(id);
        toast.success('Perfil desactivado');
      } else {
        await activateClient(id);
        toast.success('Perfil activado');
      }
      fetchClient();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateReferralStatus = async (referralId, status) => {
    try {
      await updateReferralStatus(id, referralId, status);
      toast.success('Estado actualizado');
      fetchClient();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
    }
  };

  const handleUpdateInfo = async () => {
    setSaving(true);
    try {
      await updateClient(id, infoForm);
      toast.success('Información actualizada');
      setEditInfo(false);
      fetchClient();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMedical = async () => {
    setSaving(true);
    try {
      await updateMedicalHistory(id, medicalForm);
      toast.success('Historial médico actualizado');
      fetchClient();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const addCondition = () => {
    if (conditionInput.trim()) {
      setMedicalForm({
        ...medicalForm,
        conditions: [...medicalForm.conditions, conditionInput.trim()]
      });
      setConditionInput('');
    }
  };

  const addInjury = () => {
    if (injuryInput.trim()) {
      setMedicalForm({
        ...medicalForm,
        injuries: [...medicalForm.injuries, injuryInput.trim()]
      });
      setInjuryInput('');
    }
  };

  const addMedication = () => {
    if (medicationInput.trim()) {
      setMedicalForm({
        ...medicalForm,
        medications: [...medicalForm.medications, medicationInput.trim()]
      });
      setMedicationInput('');
    }
  };

  const handleCreatePackage = async () => {
    setSaving(true);
    try {
      const result = await createPackage({
        client_id: id,
        package_type: packageForm.package_type,
        use_promo_price: packageForm.use_promo_price,
        notes: packageForm.notes
      });
      toast.success(`Paquete creado - ${formatCurrency(result.data.price)}`);
      setPackageDialogOpen(false);
      setPackageForm({ package_type: '', use_promo_price: true, notes: '' });
      fetchClient();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear paquete');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSession = async () => {
    setSaving(true);
    try {
      await createSession({
        client_id: id,
        package_id: sessionForm.package_id,
        date: sessionForm.date,
        time: sessionForm.time,
        suit_number: parseInt(sessionForm.suit_number)
      });
      toast.success('Sesión agendada');
      setSessionDialogOpen(false);
      setSessionForm({ package_id: '', date: '', time: '', suit_number: '' });
      fetchClient();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al agendar');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMeasurement = async () => {
    setSaving(true);
    try {
      const data = {};
      Object.entries(measurementForm).forEach(([key, value]) => {
        if (value !== '') {
          data[key] = key === 'notes' ? value : parseFloat(value);
        }
      });
      await addMeasurement(id, data);
      toast.success('Medida registrada');
      setMeasurementDialogOpen(false);
      setMeasurementForm({
        weight: '', height: '', chest: '', waist: '', hips: '', arm: '', thigh: '', notes: ''
      });
      fetchClient();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrar medida');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteSession = async (sessionId) => {
    try {
      await completeSession(sessionId);
      toast.success('Sesión completada');
      fetchClient();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
    }
  };

  const handleCancelSession = async (sessionId) => {
    try {
      await cancelSession(sessionId);
      toast.success('Sesión cancelada');
      fetchClient();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton rounded" />
        <div className="h-64 skeleton rounded-sm" />
      </div>
    );
  }

  const activePackages = client?.packages?.filter(p => p.status === 'active') || [];

  return (
    <div className="space-y-6" data-testid="client-profile">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/clients')} className="btn-ghost">
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="font-unbounded text-2xl text-white">{client?.name}</h1>
          <p className="text-pf-text-secondary">{client?.email}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={packageDialogOpen} onOpenChange={setPackageDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-outline" data-testid="add-package-btn">
                <Package size={18} className="mr-2" />
                Vender Paquete
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-pf-border">
              <DialogHeader>
                <DialogTitle className="font-unbounded text-white">Vender Paquete</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-pf-text-secondary">Tipo de Paquete</Label>
                  <Select
                    value={packageForm.package_type}
                    onValueChange={(value) => setPackageForm({...packageForm, package_type: value})}
                  >
                    <SelectTrigger className="input-dark" data-testid="package-type-select">
                      <SelectValue placeholder="Seleccionar paquete" />
                    </SelectTrigger>
                    <SelectContent className="bg-pf-surface border-pf-border">
                      {packageTypes?.packages && Object.entries(packageTypes.packages).map(([key, pkg]) => (
                        <SelectItem key={key} value={key} className="text-white hover:bg-pf-primary/20">
                          {pkg.name} - {pkg.duration} ({pkg.max_reschedules} reagendamientos)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {packageForm.package_type && packageTypes?.packages?.[packageForm.package_type] && (
                  <div className="bg-pf-surface p-4 rounded-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-pf-text-secondary">Precio:</span>
                      <div className="text-right">
                        <span className="text-pf-primary text-xl font-unbounded">
                          {formatCurrency(packageForm.use_promo_price 
                            ? packageTypes.packages[packageForm.package_type].promo_price 
                            : packageTypes.packages[packageForm.package_type].normal_price)}
                        </span>
                        {packageForm.use_promo_price && (
                          <span className="text-pf-text-secondary text-sm line-through ml-2">
                            {formatCurrency(packageTypes.packages[packageForm.package_type].normal_price)}
                          </span>
                        )}
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={packageForm.use_promo_price}
                        onChange={(e) => setPackageForm({...packageForm, use_promo_price: e.target.checked})}
                        className="w-4 h-4 accent-pf-primary"
                      />
                      <span className="text-pf-secondary text-sm">Aplicar precio promocional</span>
                    </label>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-pf-text-secondary">Notas</Label>
                  <Textarea
                    value={packageForm.notes}
                    onChange={(e) => setPackageForm({...packageForm, notes: e.target.value})}
                    className="input-dark min-h-[80px]"
                    data-testid="package-notes-input"
                  />
                </div>
                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="ghost" onClick={() => setPackageDialogOpen(false)} className="btn-ghost">
                    Cancelar
                  </Button>
                  <Button onClick={handleCreatePackage} className="btn-primary" disabled={saving || !packageForm.package_type} data-testid="save-package-btn">
                    {saving ? 'Guardando...' : 'Crear Paquete'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-primary" disabled={activePackages.length === 0} data-testid="add-session-btn">
                <Calendar size={18} className="mr-2" />
                Agendar Sesión
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
                    <SelectTrigger className="input-dark" data-testid="session-package-select">
                      <SelectValue placeholder="Seleccionar paquete" />
                    </SelectTrigger>
                    <SelectContent className="bg-pf-surface border-pf-border">
                      {activePackages.map((pkg) => (
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
                      data-testid="session-date-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-pf-text-secondary">Hora</Label>
                    <Select
                      value={sessionForm.time}
                      onValueChange={(value) => setSessionForm({...sessionForm, time: value})}
                    >
                      <SelectTrigger className="input-dark" data-testid="session-time-select">
                        <SelectValue placeholder="Seleccionar hora" />
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
                  <Label className="text-pf-text-secondary">Traje (1-6)</Label>
                  <Select
                    value={sessionForm.suit_number}
                    onValueChange={(value) => setSessionForm({...sessionForm, suit_number: value})}
                  >
                    <SelectTrigger className="input-dark" data-testid="session-suit-select">
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
                <div className="flex gap-3 justify-end pt-4">
                  <Button variant="ghost" onClick={() => setSessionDialogOpen(false)} className="btn-ghost">
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateSession} className="btn-primary" disabled={saving} data-testid="save-session-btn">
                    {saving ? 'Guardando...' : 'Agendar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="bg-pf-surface border border-pf-border">
          <TabsTrigger value="info" className="data-[state=active]:bg-pf-primary data-[state=active]:text-white">
            <User size={16} className="mr-2" />Información
          </TabsTrigger>
          <TabsTrigger value="packages" className="data-[state=active]:bg-pf-primary data-[state=active]:text-white">
            <Package size={16} className="mr-2" />Paquetes
          </TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-pf-primary data-[state=active]:text-white">
            <Calendar size={16} className="mr-2" />Sesiones
          </TabsTrigger>
          <TabsTrigger value="medical" className="data-[state=active]:bg-pf-primary data-[state=active]:text-white">
            <Activity size={16} className="mr-2" />Historial Médico
          </TabsTrigger>
          <TabsTrigger value="measurements" className="data-[state=active]:bg-pf-primary data-[state=active]:text-white">
            <Ruler size={16} className="mr-2" />Medidas
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info">
          <Card className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-unbounded text-lg text-white">Datos Personales</h3>
              {!editInfo ? (
                <Button variant="ghost" onClick={() => setEditInfo(true)} className="btn-ghost" data-testid="edit-info-btn">
                  Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setEditInfo(false)} className="btn-ghost">
                    Cancelar
                  </Button>
                  <Button onClick={handleUpdateInfo} className="btn-primary" disabled={saving} data-testid="save-info-btn">
                    <Save size={16} className="mr-2" />Guardar
                  </Button>
                </div>
              )}
            </div>

            {editInfo ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-pf-text-secondary">Nombre</Label>
                  <Input
                    value={infoForm.name}
                    onChange={(e) => setInfoForm({...infoForm, name: e.target.value})}
                    className="input-dark"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-pf-text-secondary">Teléfono</Label>
                  <Input
                    value={infoForm.phone}
                    onChange={(e) => setInfoForm({...infoForm, phone: e.target.value})}
                    className="input-dark"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-pf-text-secondary">Fecha de Nacimiento</Label>
                  <Input
                    type="date"
                    value={infoForm.birth_date}
                    onChange={(e) => setInfoForm({...infoForm, birth_date: e.target.value})}
                    className="input-dark"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-pf-text-secondary">Contacto de Emergencia</Label>
                  <Input
                    value={infoForm.emergency_contact}
                    onChange={(e) => setInfoForm({...infoForm, emergency_contact: e.target.value})}
                    className="input-dark"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-pf-text-secondary">Teléfono de Emergencia</Label>
                  <Input
                    value={infoForm.emergency_phone}
                    onChange={(e) => setInfoForm({...infoForm, emergency_phone: e.target.value})}
                    className="input-dark"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <Phone className="text-pf-primary" size={20} />
                  <div>
                    <p className="text-pf-text-secondary text-sm">Teléfono</p>
                    <p className="text-white">{client?.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="text-pf-primary" size={20} />
                  <div>
                    <p className="text-pf-text-secondary text-sm">Email</p>
                    <p className="text-white">{client?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="text-pf-primary" size={20} />
                  <div>
                    <p className="text-pf-text-secondary text-sm">Fecha de Nacimiento</p>
                    <p className="text-white">{client?.birth_date || 'No registrada'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AlertCircle className="text-pf-warning" size={20} />
                  <div>
                    <p className="text-pf-text-secondary text-sm">Contacto de Emergencia</p>
                    <p className="text-white">
                      {client?.emergency_contact 
                        ? `${client.emergency_contact} - ${client.emergency_phone}`
                        : 'No registrado'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Packages Tab */}
        <TabsContent value="packages">
          <div className="space-y-4">
            {client?.packages?.length === 0 ? (
              <Card className="glass-card p-8 text-center">
                <Package className="mx-auto text-pf-text-secondary mb-4" size={48} />
                <p className="text-pf-text-secondary mb-4">Sin paquetes registrados</p>
                <Button onClick={() => setPackageDialogOpen(true)} className="btn-primary">
                  <Plus size={18} className="mr-2" />Vender Paquete
                </Button>
              </Card>
            ) : (
              client?.packages?.map((pkg) => (
                <Card key={pkg.id} className="glass-card p-5" data-testid={`package-${pkg.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-sm flex items-center justify-center ${
                        pkg.status === 'active' ? 'bg-pf-primary/20' : 'bg-pf-text-secondary/20'
                      }`}>
                        <Package className={pkg.status === 'active' ? 'text-pf-primary' : 'text-pf-text-secondary'} size={24} />
                      </div>
                      <div>
                        <h4 className="text-white font-medium">
                          Paquete de {pkg.total_sessions} Sesiones
                        </h4>
                        <p className="text-pf-text-secondary text-sm">
                          {pkg.remaining_sessions} sesiones restantes
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={pkg.status === 'active' ? 'badge-active' : 'badge-error'}>
                        {pkg.status === 'active' ? 'Activo' : pkg.status}
                      </Badge>
                      <p className="text-pf-text-secondary text-sm mt-1">
                        Reagendamientos: {pkg.used_reschedules}/{pkg.max_reschedules}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-pf-border">
                    <div className="progress-bar">
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${((pkg.total_sessions - pkg.remaining_sessions) / pkg.total_sessions) * 100}%` }}
                      />
                    </div>
                    <p className="text-pf-text-secondary text-xs mt-2">
                      {pkg.total_sessions - pkg.remaining_sessions} de {pkg.total_sessions} sesiones usadas
                    </p>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions">
          <div className="space-y-4">
            {client?.sessions?.length === 0 ? (
              <Card className="glass-card p-8 text-center">
                <Calendar className="mx-auto text-pf-text-secondary mb-4" size={48} />
                <p className="text-pf-text-secondary mb-4">Sin sesiones registradas</p>
                {activePackages.length > 0 && (
                  <Button onClick={() => setSessionDialogOpen(true)} className="btn-primary">
                    <Plus size={18} className="mr-2" />Agendar Sesión
                  </Button>
                )}
              </Card>
            ) : (
              client?.sessions?.map((session) => (
                <Card key={session.id} className="glass-card p-5" data-testid={`session-${session.id}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-sm flex items-center justify-center ${
                        session.status === 'completed' ? 'bg-pf-secondary/20' :
                        session.status === 'cancelled' ? 'bg-pf-error/20' :
                        'bg-pf-primary/20'
                      }`}>
                        <Clock className={
                          session.status === 'completed' ? 'text-pf-secondary' :
                          session.status === 'cancelled' ? 'text-pf-error' :
                          'text-pf-primary'
                        } size={24} />
                      </div>
                      <div>
                        <p className="text-white font-mono text-lg">{session.date}</p>
                        <p className="text-pf-text-secondary text-sm">
                          {session.time} • Traje {session.suit_number}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={
                        session.status === 'completed' ? 'badge-active' :
                        session.status === 'cancelled' ? 'badge-error' :
                        session.is_reschedule ? 'badge-pending' :
                        'badge-active'
                      }>
                        {session.status === 'completed' ? 'Completada' :
                         session.status === 'cancelled' ? 'Cancelada' :
                         session.is_reschedule ? 'Reagendada' : 'Programada'}
                      </Badge>
                      {session.status === 'scheduled' || session.status === 'rescheduled' ? (
                        <div className="flex gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-pf-secondary hover:bg-pf-secondary/20"
                            onClick={() => handleCompleteSession(session.id)}
                            data-testid={`complete-session-${session.id}`}
                          >
                            <Check size={16} />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-pf-error hover:bg-pf-error/20"
                            onClick={() => handleCancelSession(session.id)}
                            data-testid={`cancel-session-${session.id}`}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Medical Tab */}
        <TabsContent value="medical">
          <Card className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-unbounded text-lg text-white">Historial Médico</h3>
              <Button onClick={handleUpdateMedical} className="btn-primary" disabled={saving} data-testid="save-medical-btn">
                <Save size={16} className="mr-2" />Guardar Cambios
              </Button>
            </div>

            <div className="space-y-6">
              {/* Conditions */}
              <div>
                <Label className="text-pf-primary font-medium">Condiciones Médicas</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={conditionInput}
                    onChange={(e) => setConditionInput(e.target.value)}
                    placeholder="Agregar condición..."
                    className="input-dark"
                    onKeyPress={(e) => e.key === 'Enter' && addCondition()}
                    data-testid="condition-input"
                  />
                  <Button onClick={addCondition} className="btn-outline" data-testid="add-condition-btn">
                    <Plus size={18} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {medicalForm.conditions.map((condition, i) => (
                    <Badge key={i} className="badge-pending">
                      {condition}
                      <button 
                        onClick={() => setMedicalForm({
                          ...medicalForm,
                          conditions: medicalForm.conditions.filter((_, idx) => idx !== i)
                        })}
                        className="ml-2 hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Injuries */}
              <div>
                <Label className="text-pf-primary font-medium">Lesiones</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={injuryInput}
                    onChange={(e) => setInjuryInput(e.target.value)}
                    placeholder="Agregar lesión..."
                    className="input-dark"
                    onKeyPress={(e) => e.key === 'Enter' && addInjury()}
                    data-testid="injury-input"
                  />
                  <Button onClick={addInjury} className="btn-outline" data-testid="add-injury-btn">
                    <Plus size={18} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {medicalForm.injuries.map((injury, i) => (
                    <Badge key={i} className="badge-error">
                      {injury}
                      <button 
                        onClick={() => setMedicalForm({
                          ...medicalForm,
                          injuries: medicalForm.injuries.filter((_, idx) => idx !== i)
                        })}
                        className="ml-2 hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Medications */}
              <div>
                <Label className="text-pf-primary font-medium">Medicamentos</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={medicationInput}
                    onChange={(e) => setMedicationInput(e.target.value)}
                    placeholder="Agregar medicamento..."
                    className="input-dark"
                    onKeyPress={(e) => e.key === 'Enter' && addMedication()}
                    data-testid="medication-input"
                  />
                  <Button onClick={addMedication} className="btn-outline" data-testid="add-medication-btn">
                    <Plus size={18} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {medicalForm.medications.map((medication, i) => (
                    <Badge key={i} className="badge-active">
                      {medication}
                      <button 
                        onClick={() => setMedicalForm({
                          ...medicalForm,
                          medications: medicalForm.medications.filter((_, idx) => idx !== i)
                        })}
                        className="ml-2 hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-pf-primary font-medium">Notas Adicionales</Label>
                <Textarea
                  value={medicalForm.notes}
                  onChange={(e) => setMedicalForm({...medicalForm, notes: e.target.value})}
                  placeholder="Notas sobre el historial médico del cliente..."
                  className="input-dark min-h-[100px] mt-2"
                  data-testid="medical-notes"
                />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Measurements Tab */}
        <TabsContent value="measurements">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={measurementDialogOpen} onOpenChange={setMeasurementDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="btn-primary" data-testid="add-measurement-btn">
                    <Plus size={18} className="mr-2" />Nueva Medida
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card border-pf-border max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-unbounded text-white">Registrar Medidas</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-pf-text-secondary">Peso (kg)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={measurementForm.weight}
                          onChange={(e) => setMeasurementForm({...measurementForm, weight: e.target.value})}
                          className="input-dark"
                          data-testid="measurement-weight"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-pf-text-secondary">Altura (cm)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={measurementForm.height}
                          onChange={(e) => setMeasurementForm({...measurementForm, height: e.target.value})}
                          className="input-dark"
                          data-testid="measurement-height"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-pf-text-secondary">Pecho (cm)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={measurementForm.chest}
                          onChange={(e) => setMeasurementForm({...measurementForm, chest: e.target.value})}
                          className="input-dark"
                          data-testid="measurement-chest"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-pf-text-secondary">Cintura (cm)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={measurementForm.waist}
                          onChange={(e) => setMeasurementForm({...measurementForm, waist: e.target.value})}
                          className="input-dark"
                          data-testid="measurement-waist"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-pf-text-secondary">Cadera (cm)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={measurementForm.hips}
                          onChange={(e) => setMeasurementForm({...measurementForm, hips: e.target.value})}
                          className="input-dark"
                          data-testid="measurement-hips"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-pf-text-secondary">Brazo (cm)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={measurementForm.arm}
                          onChange={(e) => setMeasurementForm({...measurementForm, arm: e.target.value})}
                          className="input-dark"
                          data-testid="measurement-arm"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label className="text-pf-text-secondary">Muslo (cm)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={measurementForm.thigh}
                          onChange={(e) => setMeasurementForm({...measurementForm, thigh: e.target.value})}
                          className="input-dark"
                          data-testid="measurement-thigh"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-pf-text-secondary">Notas</Label>
                      <Textarea
                        value={measurementForm.notes}
                        onChange={(e) => setMeasurementForm({...measurementForm, notes: e.target.value})}
                        className="input-dark"
                        data-testid="measurement-notes"
                      />
                    </div>
                    <div className="flex gap-3 justify-end pt-4">
                      <Button variant="ghost" onClick={() => setMeasurementDialogOpen(false)} className="btn-ghost">
                        Cancelar
                      </Button>
                      <Button onClick={handleAddMeasurement} className="btn-primary" disabled={saving} data-testid="save-measurement-btn">
                        {saving ? 'Guardando...' : 'Registrar'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {client?.measurements?.length === 0 ? (
              <Card className="glass-card p-8 text-center">
                <Ruler className="mx-auto text-pf-text-secondary mb-4" size={48} />
                <p className="text-pf-text-secondary mb-4">Sin medidas registradas</p>
                <Button onClick={() => setMeasurementDialogOpen(true)} className="btn-primary">
                  <Plus size={18} className="mr-2" />Registrar Primera Medida
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {client?.measurements?.slice().reverse().map((m, i) => (
                  <Card key={m.id || i} className="glass-card p-5" data-testid={`measurement-${i}`}>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-pf-primary font-mono">{new Date(m.date).toLocaleDateString('es-MX')}</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {m.weight && (
                        <div>
                          <p className="text-pf-text-secondary text-xs">Peso</p>
                          <p className="text-white font-mono">{m.weight} kg</p>
                        </div>
                      )}
                      {m.height && (
                        <div>
                          <p className="text-pf-text-secondary text-xs">Altura</p>
                          <p className="text-white font-mono">{m.height} cm</p>
                        </div>
                      )}
                      {m.chest && (
                        <div>
                          <p className="text-pf-text-secondary text-xs">Pecho</p>
                          <p className="text-white font-mono">{m.chest} cm</p>
                        </div>
                      )}
                      {m.waist && (
                        <div>
                          <p className="text-pf-text-secondary text-xs">Cintura</p>
                          <p className="text-white font-mono">{m.waist} cm</p>
                        </div>
                      )}
                      {m.hips && (
                        <div>
                          <p className="text-pf-text-secondary text-xs">Cadera</p>
                          <p className="text-white font-mono">{m.hips} cm</p>
                        </div>
                      )}
                      {m.arm && (
                        <div>
                          <p className="text-pf-text-secondary text-xs">Brazo</p>
                          <p className="text-white font-mono">{m.arm} cm</p>
                        </div>
                      )}
                      {m.thigh && (
                        <div>
                          <p className="text-pf-text-secondary text-xs">Muslo</p>
                          <p className="text-white font-mono">{m.thigh} cm</p>
                        </div>
                      )}
                    </div>
                    {m.notes && (
                      <p className="text-pf-text-secondary text-sm mt-4 pt-4 border-t border-pf-border">
                        {m.notes}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
