import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  getClients, 
  getReceptionTodaySales, 
  getCurrentShift, 
  startShift, 
  closeShift,
  createSale,
  getPackageTypes,
  createPackage,
  payInscription,
  addNutritionPlan,
  activateClient
} from '../lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  Users, 
  DollarSign, 
  Clock, 
  LogOut,
  Search,
  Play,
  Square,
  Banknote,
  CreditCard,
  Building,
  ChevronRight,
  User,
  AlertCircle,
  CheckCircle,
  Package
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

export default function Reception() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [todaySales, setTodaySales] = useState({ sales: [], summary: {} });
  const [currentShift, setCurrentShift] = useState(null);
  const [packageTypes, setPackageTypes] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [shiftStartDialogOpen, setShiftStartDialogOpen] = useState(false);
  const [shiftCloseDialogOpen, setShiftCloseDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  
  // Forms
  const [startingCash, setStartingCash] = useState('');
  const [finalCash, setFinalCash] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = async () => {
    try {
      const [salesRes, shiftRes, typesRes] = await Promise.all([
        getReceptionTodaySales(),
        getCurrentShift(),
        getPackageTypes()
      ]);
      setTodaySales(salesRes.data);
      setCurrentShift(shiftRes.data);
      setPackageTypes(typesRes.data);
      await fetchClients();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async (searchTerm = '') => {
    try {
      const response = await getClients(searchTerm);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleStartShift = async () => {
    setSaving(true);
    try {
      await startShift(parseFloat(startingCash) || 0);
      toast.success('Turno iniciado');
      setShiftStartDialogOpen(false);
      setStartingCash('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al iniciar turno');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseShift = async () => {
    setSaving(true);
    try {
      const result = await closeShift(parseFloat(finalCash), closeNotes);
      toast.success('Corte de caja realizado');
      setShiftCloseDialogOpen(false);
      setFinalCash('');
      setCloseNotes('');
      fetchData();
      
      // Show summary
      const summary = result.data.shift_summary;
      alert(`CORTE DE CAJA\n\nVentas totales: $${summary.sales_total.toLocaleString()}\nEfectivo esperado: $${summary.expected_cash.toLocaleString()}\nEfectivo final: $${summary.final_cash.toLocaleString()}\nDiferencia: $${summary.difference.toLocaleString()}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al cerrar turno');
    } finally {
      setSaving(false);
    }
  };

  const handlePayInscription = async (clientId) => {
    setSaving(true);
    try {
      await payInscription(clientId);
      toast.success('Inscripción cobrada');
      fetchData();
      if (selectedClient?.id === clientId) {
        // Refresh client data
        const clientRes = await getClients();
        const updatedClient = clientRes.data.find(c => c.id === clientId);
        setSelectedClient(updatedClient);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleActivateClient = async (clientId) => {
    setSaving(true);
    try {
      await activateClient(clientId);
      toast.success('Perfil activado');
      fetchData();
      if (selectedClient?.id === clientId) {
        const clientRes = await getClients();
        const updatedClient = clientRes.data.find(c => c.id === clientId);
        setSelectedClient(updatedClient);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
    } finally {
      setSaving(false);
    }
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
      <div className="min-h-screen bg-pf-background flex items-center justify-center">
        <div className="animate-pulse-neon w-16 h-16 rounded-full bg-pf-primary/20" />
      </div>
    );
  }

  const hasOpenShift = currentShift?.has_open_shift;
  const shiftData = currentShift?.shift;
  const shiftSalesSummary = currentShift?.sales_summary;

  return (
    <div className="min-h-screen bg-pf-background" data-testid="reception-page">
      {/* Header */}
      <header className="bg-pf-surface border-b border-pf-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <img src={LOGO_URL} alt="Pump Fit" className="h-10" />
            <Badge className="bg-pf-secondary/20 text-pf-secondary border-pf-secondary/30">
              Mostrador
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-medium">{user?.name}</p>
              <p className="text-pf-text-secondary text-xs">
                {hasOpenShift ? '🟢 Turno activo' : '🔴 Sin turno'}
              </p>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleLogout}
              className="text-pf-error hover:bg-pf-error/10"
              data-testid="reception-logout-btn"
            >
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Shift Controls */}
        {!hasOpenShift ? (
          <Card className="bg-pf-warning/10 border-pf-warning/30 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <AlertCircle className="text-pf-warning" size={32} />
                <div>
                  <h2 className="font-unbounded text-lg text-white">Sin Turno Activo</h2>
                  <p className="text-pf-text-secondary">Inicia tu turno para comenzar a registrar ventas</p>
                </div>
              </div>
              <Button onClick={() => setShiftStartDialogOpen(true)} className="btn-primary" data-testid="start-shift-btn">
                <Play size={18} className="mr-2" />
                Iniciar Turno
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="bg-green-500/10 border-green-500/30 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <CheckCircle className="text-green-500" size={32} />
                <div>
                  <h2 className="font-unbounded text-lg text-white">Turno Activo</h2>
                  <p className="text-pf-text-secondary">
                    Inicio: {format(new Date(shiftData?.start_time), "HH:mm", { locale: es })} • 
                    Efectivo inicial: {formatCurrency(shiftData?.starting_cash)}
                  </p>
                </div>
              </div>
              <Button onClick={() => setShiftCloseDialogOpen(true)} className="bg-pf-error hover:bg-pf-error/80 text-white" data-testid="close-shift-btn">
                <Square size={18} className="mr-2" />
                Cerrar Turno (Corte)
              </Button>
            </div>

            {/* Shift Sales Summary */}
            {shiftSalesSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-pf-background p-3 rounded-sm">
                  <p className="text-pf-text-secondary text-xs">Ventas del Turno</p>
                  <p className="text-pf-primary text-xl font-mono">{formatCurrency(shiftSalesSummary.total)}</p>
                  <p className="text-pf-text-secondary text-xs">{shiftSalesSummary.count} transacciones</p>
                </div>
                <div className="bg-pf-background p-3 rounded-sm">
                  <p className="text-pf-text-secondary text-xs flex items-center gap-1"><Banknote size={12} /> Efectivo</p>
                  <p className="text-green-500 text-xl font-mono">{formatCurrency(shiftSalesSummary.cash)}</p>
                </div>
                <div className="bg-pf-background p-3 rounded-sm">
                  <p className="text-pf-text-secondary text-xs flex items-center gap-1"><CreditCard size={12} /> Tarjeta</p>
                  <p className="text-pf-secondary text-xl font-mono">{formatCurrency(shiftSalesSummary.card)}</p>
                </div>
                <div className="bg-pf-background p-3 rounded-sm">
                  <p className="text-pf-text-secondary text-xs flex items-center gap-1"><Building size={12} /> Transferencia</p>
                  <p className="text-purple-500 text-xl font-mono">{formatCurrency(shiftSalesSummary.transfer)}</p>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="bg-pf-surface border border-pf-border">
            <TabsTrigger value="clients" className="data-[state=active]:bg-pf-primary data-[state=active]:text-white">
              <Users size={16} className="mr-2" />Clientes
            </TabsTrigger>
            <TabsTrigger value="sales" className="data-[state=active]:bg-pf-primary data-[state=active]:text-white">
              <DollarSign size={16} className="mr-2" />Ventas de Hoy
            </TabsTrigger>
          </TabsList>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-pf-text-secondary" size={20} />
              <Input
                placeholder="Buscar cliente por nombre, email o teléfono..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-dark pl-12"
                data-testid="search-clients-reception"
              />
            </div>

            {/* Clients List */}
            <div className="space-y-2">
              {clients.length === 0 ? (
                <Card className="glass-card p-8 text-center">
                  <Users className="mx-auto text-pf-text-secondary mb-4" size={48} />
                  <p className="text-pf-text-secondary">
                    {search ? 'No se encontraron clientes' : 'Sin clientes registrados'}
                  </p>
                </Card>
              ) : (
                clients.map((client) => (
                  <Card 
                    key={client.id} 
                    className="glass-card p-4 cursor-pointer hover:border-pf-primary/50 transition-colors"
                    onClick={() => { setSelectedClient(client); setClientDialogOpen(true); }}
                    data-testid={`reception-client-${client.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-pf-primary/20 flex items-center justify-center">
                          <User className="text-pf-primary" size={20} />
                        </div>
                        <div>
                          <p className="text-white font-medium">{client.name}</p>
                          <p className="text-pf-text-secondary text-sm">{client.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={client.profile_active ? 'badge-active' : 'badge-pending'}>
                          {client.profile_active ? 'Activo' : 'Pendiente'}
                        </Badge>
                        {!client.inscription_paid && (
                          <Badge className="badge-error">Sin inscripción</Badge>
                        )}
                        <ChevronRight className="text-pf-text-secondary" size={20} />
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glass-card p-4 text-center">
                <DollarSign className="mx-auto text-pf-primary mb-2" size={24} />
                <p className="text-2xl font-unbounded text-pf-primary">
                  {formatCurrency(todaySales.summary?.total)}
                </p>
                <p className="text-pf-text-secondary text-xs">Total Hoy</p>
              </Card>
              <Card className="glass-card p-4 text-center">
                <Banknote className="mx-auto text-green-500 mb-2" size={24} />
                <p className="text-2xl font-unbounded text-green-500">
                  {formatCurrency(todaySales.summary?.cash)}
                </p>
                <p className="text-pf-text-secondary text-xs">Efectivo</p>
              </Card>
              <Card className="glass-card p-4 text-center">
                <CreditCard className="mx-auto text-pf-secondary mb-2" size={24} />
                <p className="text-2xl font-unbounded text-pf-secondary">
                  {formatCurrency(todaySales.summary?.card)}
                </p>
                <p className="text-pf-text-secondary text-xs">Tarjeta</p>
              </Card>
              <Card className="glass-card p-4 text-center">
                <Building className="mx-auto text-purple-500 mb-2" size={24} />
                <p className="text-2xl font-unbounded text-purple-500">
                  {formatCurrency(todaySales.summary?.transfer)}
                </p>
                <p className="text-pf-text-secondary text-xs">Transferencia</p>
              </Card>
            </div>

            {/* Sales List */}
            <Card className="glass-card overflow-hidden">
              <div className="p-4 border-b border-pf-border">
                <h3 className="font-unbounded text-white">Ventas del Día</h3>
              </div>
              {todaySales.sales?.length === 0 ? (
                <div className="p-8 text-center">
                  <DollarSign className="mx-auto text-pf-text-secondary mb-4" size={48} />
                  <p className="text-pf-text-secondary">Sin ventas registradas hoy</p>
                </div>
              ) : (
                <div className="divide-y divide-pf-border/50">
                  {todaySales.sales?.map((sale) => (
                    <div key={sale.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{sale.client_name}</p>
                        <p className="text-pf-text-secondary text-sm">{sale.description}</p>
                        <p className="text-pf-text-secondary text-xs font-mono">
                          {format(new Date(sale.created_at), "HH:mm", { locale: es })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-pf-primary font-mono text-lg">{formatCurrency(sale.amount)}</p>
                        <Badge className={
                          sale.payment_method === 'cash' ? 'badge-active' :
                          sale.payment_method === 'card' ? 'badge-pending' :
                          'bg-purple-500/10 text-purple-500 border-purple-500/20'
                        }>
                          {sale.payment_method === 'cash' ? 'Efectivo' :
                           sale.payment_method === 'card' ? 'Tarjeta' : 'Transferencia'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Start Shift Dialog */}
      <Dialog open={shiftStartDialogOpen} onOpenChange={setShiftStartDialogOpen}>
        <DialogContent className="glass-card border-pf-border">
          <DialogHeader>
            <DialogTitle className="font-unbounded text-white">Iniciar Turno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-pf-text-secondary">
              Ingresa el efectivo inicial en caja para comenzar tu turno.
            </p>
            <div className="space-y-2">
              <Label className="text-pf-text-secondary">Efectivo Inicial ($)</Label>
              <Input
                type="number"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                placeholder="0"
                className="input-dark"
                data-testid="starting-cash-input"
              />
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="ghost" onClick={() => setShiftStartDialogOpen(false)} className="btn-ghost">
                Cancelar
              </Button>
              <Button onClick={handleStartShift} className="btn-primary" disabled={saving} data-testid="confirm-start-shift-btn">
                {saving ? 'Iniciando...' : 'Iniciar Turno'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={shiftCloseDialogOpen} onOpenChange={setShiftCloseDialogOpen}>
        <DialogContent className="glass-card border-pf-border">
          <DialogHeader>
            <DialogTitle className="font-unbounded text-white">Cerrar Turno - Corte de Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {shiftSalesSummary && (
              <div className="bg-pf-surface p-4 rounded-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-pf-text-secondary">Efectivo inicial:</span>
                  <span className="text-white font-mono">{formatCurrency(shiftData?.starting_cash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pf-text-secondary">+ Ventas en efectivo:</span>
                  <span className="text-green-500 font-mono">{formatCurrency(shiftSalesSummary.cash)}</span>
                </div>
                <div className="flex justify-between border-t border-pf-border pt-2">
                  <span className="text-white font-medium">Efectivo esperado:</span>
                  <span className="text-pf-primary font-mono font-bold">{formatCurrency(shiftSalesSummary.expected_cash)}</span>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-pf-text-secondary">Efectivo Final en Caja ($)</Label>
              <Input
                type="number"
                value={finalCash}
                onChange={(e) => setFinalCash(e.target.value)}
                placeholder="Cuenta el efectivo en caja"
                className="input-dark"
                data-testid="final-cash-input"
              />
              {finalCash && shiftSalesSummary && (
                <p className={`text-sm ${parseFloat(finalCash) - shiftSalesSummary.expected_cash === 0 ? 'text-green-500' : parseFloat(finalCash) - shiftSalesSummary.expected_cash > 0 ? 'text-pf-secondary' : 'text-pf-error'}`}>
                  Diferencia: {formatCurrency(parseFloat(finalCash) - shiftSalesSummary.expected_cash)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-pf-text-secondary">Notas (opcional)</Label>
              <Input
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                placeholder="Observaciones del turno..."
                className="input-dark"
                data-testid="close-notes-input"
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="ghost" onClick={() => setShiftCloseDialogOpen(false)} className="btn-ghost">
                Cancelar
              </Button>
              <Button 
                onClick={handleCloseShift} 
                className="bg-pf-error hover:bg-pf-error/80 text-white" 
                disabled={saving || !finalCash}
                data-testid="confirm-close-shift-btn"
              >
                {saving ? 'Cerrando...' : 'Cerrar Turno y Hacer Corte'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Detail Dialog */}
      <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
        <DialogContent className="glass-card border-pf-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-unbounded text-white">{selectedClient?.name}</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4 mt-4">
              {/* Client Info */}
              <div className="bg-pf-surface p-4 rounded-sm space-y-2">
                <p className="text-pf-text-secondary text-sm">📞 {selectedClient.phone}</p>
                <p className="text-pf-text-secondary text-sm">📧 {selectedClient.email}</p>
              </div>

              {/* Status Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-sm border ${selectedClient.inscription_paid ? 'bg-green-500/10 border-green-500/30' : 'bg-pf-error/10 border-pf-error/30'}`}>
                  <p className="text-xs text-pf-text-secondary">Inscripción</p>
                  <p className={`font-medium ${selectedClient.inscription_paid ? 'text-green-500' : 'text-pf-error'}`}>
                    {selectedClient.inscription_paid ? '✓ Pagada' : '✗ Pendiente'}
                  </p>
                </div>
                <div className={`p-3 rounded-sm border ${selectedClient.profile_active ? 'bg-green-500/10 border-green-500/30' : 'bg-pf-warning/10 border-pf-warning/30'}`}>
                  <p className="text-xs text-pf-text-secondary">Perfil</p>
                  <p className={`font-medium ${selectedClient.profile_active ? 'text-green-500' : 'text-pf-warning'}`}>
                    {selectedClient.profile_active ? '✓ Activo' : '⏳ Pendiente'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {!selectedClient.inscription_paid && (
                  <Button 
                    onClick={() => handlePayInscription(selectedClient.id)} 
                    className="w-full btn-primary"
                    disabled={saving}
                    data-testid="pay-inscription-reception-btn"
                  >
                    <DollarSign size={18} className="mr-2" />
                    Cobrar Inscripción ({formatCurrency(packageTypes?.inscription_price || 599)})
                  </Button>
                )}
                
                {selectedClient.inscription_paid && !selectedClient.profile_active && (
                  <Button 
                    onClick={() => handleActivateClient(selectedClient.id)} 
                    className="w-full btn-outline"
                    disabled={saving}
                    data-testid="activate-client-reception-btn"
                  >
                    <CheckCircle size={18} className="mr-2" />
                    Activar Perfil
                  </Button>
                )}

                <Link to={`/clients/${selectedClient.id}`} className="block">
                  <Button className="w-full btn-ghost border border-pf-border">
                    Ver Perfil Completo
                    <ChevronRight size={18} className="ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-pf-surface border-t border-pf-border p-4 mt-8">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-pf-text-secondary text-sm">
            Pump Fit CRM - Mostrador
          </p>
        </div>
      </footer>
    </div>
  );
}
