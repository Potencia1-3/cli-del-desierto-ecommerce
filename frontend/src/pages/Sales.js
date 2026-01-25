import { useState, useEffect } from 'react';
import { getSales, getSalesSummary, createSale, getClients } from '../lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Plus,
  Search,
  Filter
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

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
];

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({ day: {}, week: {}, month: {} });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [period, setPeriod] = useState('month');
  
  const [saleForm, setSaleForm] = useState({
    client_id: '',
    description: '',
    amount: '',
    payment_method: 'cash'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, dayRes, weekRes, monthRes, clientsRes] = await Promise.all([
        getSales(),
        getSalesSummary('day'),
        getSalesSummary('week'),
        getSalesSummary('month'),
        getClients()
      ]);
      setSales(salesRes.data);
      setSummary({
        day: dayRes.data,
        week: weekRes.data,
        month: monthRes.data
      });
      setClients(clientsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSale = async () => {
    setSaving(true);
    try {
      await createSale({
        client_id: saleForm.client_id,
        description: saleForm.description,
        amount: parseFloat(saleForm.amount),
        payment_method: saleForm.payment_method
      });
      toast.success('Venta registrada');
      setDialogOpen(false);
      setSaleForm({ client_id: '', description: '', amount: '', payment_method: 'cash' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrar venta');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getPaymentMethodLabel = (method) => {
    const found = PAYMENT_METHODS.find(m => m.value === method);
    return found ? found.label : method;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 skeleton rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="sales-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-unbounded text-2xl md:text-3xl text-white">Ventas</h1>
          <p className="text-pf-text-secondary mt-1">
            Control de ingresos y transacciones
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary" data-testid="new-sale-btn">
              <Plus size={18} className="mr-2" />
              Nueva Venta
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-pf-border">
            <DialogHeader>
              <DialogTitle className="font-unbounded text-white">Registrar Venta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-pf-text-secondary">Cliente</Label>
                <Select
                  value={saleForm.client_id}
                  onValueChange={(value) => setSaleForm({...saleForm, client_id: value})}
                >
                  <SelectTrigger className="input-dark" data-testid="sale-client-select">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent className="bg-pf-surface border-pf-border max-h-60">
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id} className="text-white hover:bg-pf-primary/20">
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-pf-text-secondary">Descripción</Label>
                <Input
                  value={saleForm.description}
                  onChange={(e) => setSaleForm({...saleForm, description: e.target.value})}
                  placeholder="Ej: Paquete 8 sesiones, Producto, etc."
                  className="input-dark"
                  data-testid="sale-description-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-pf-text-secondary">Monto (MXN)</Label>
                  <Input
                    type="number"
                    value={saleForm.amount}
                    onChange={(e) => setSaleForm({...saleForm, amount: e.target.value})}
                    placeholder="0.00"
                    className="input-dark"
                    data-testid="sale-amount-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-pf-text-secondary">Método de Pago</Label>
                  <Select
                    value={saleForm.payment_method}
                    onValueChange={(value) => setSaleForm({...saleForm, payment_method: value})}
                  >
                    <SelectTrigger className="input-dark" data-testid="sale-payment-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-pf-surface border-pf-border">
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value} className="text-white hover:bg-pf-primary/20">
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button variant="ghost" onClick={() => setDialogOpen(false)} className="btn-ghost">
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateSale} 
                  className="btn-primary" 
                  disabled={saving || !saleForm.client_id || !saleForm.description || !saleForm.amount}
                  data-testid="save-sale-btn"
                >
                  {saving ? 'Guardando...' : 'Registrar Venta'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card p-6 stats-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-pf-text-secondary text-sm">Ventas Hoy</p>
              <p className="text-3xl font-unbounded text-pf-primary mt-2">
                {formatCurrency(summary.day.total || 0)}
              </p>
              <p className="text-pf-text-secondary text-xs mt-1">
                {summary.day.count || 0} transacciones
              </p>
            </div>
            <div className="p-3 bg-pf-primary/10 rounded-sm">
              <DollarSign className="text-pf-primary" size={24} />
            </div>
          </div>
        </Card>

        <Card className="glass-card p-6 stats-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-pf-text-secondary text-sm">Esta Semana</p>
              <p className="text-3xl font-unbounded text-pf-secondary mt-2">
                {formatCurrency(summary.week.total || 0)}
              </p>
              <p className="text-pf-text-secondary text-xs mt-1">
                {summary.week.count || 0} transacciones
              </p>
            </div>
            <div className="p-3 bg-pf-secondary/10 rounded-sm">
              <Calendar className="text-pf-secondary" size={24} />
            </div>
          </div>
        </Card>

        <Card className="glass-card p-6 stats-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-pf-text-secondary text-sm">Este Mes</p>
              <p className="text-3xl font-unbounded text-green-500 mt-2">
                {formatCurrency(summary.month.total || 0)}
              </p>
              <p className="text-pf-text-secondary text-xs mt-1">
                {summary.month.count || 0} transacciones
              </p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-sm">
              <TrendingUp className="text-green-500" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Sales Table */}
      <Card className="glass-card overflow-hidden">
        <div className="p-4 border-b border-pf-border flex items-center justify-between">
          <h3 className="font-unbounded text-lg text-white">Historial de Ventas</h3>
          <Badge className="badge-active">{sales.length} registros</Badge>
        </div>

        {sales.length === 0 ? (
          <div className="p-8 text-center">
            <DollarSign className="mx-auto text-pf-text-secondary mb-4" size={48} />
            <p className="text-pf-text-secondary mb-4">Sin ventas registradas</p>
            <Button onClick={() => setDialogOpen(true)} className="btn-primary">
              <Plus size={18} className="mr-2" />
              Registrar Primera Venta
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Descripción</th>
                  <th>Método</th>
                  <th className="text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} data-testid={`sale-row-${sale.id}`}>
                    <td>
                      <span className="font-mono text-sm">
                        {format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: es })}
                      </span>
                    </td>
                    <td>
                      <span className="text-white">{sale.client_name}</span>
                    </td>
                    <td>
                      <span className="text-pf-text-secondary">{sale.description}</span>
                    </td>
                    <td>
                      <Badge className={
                        sale.payment_method === 'cash' ? 'badge-active' :
                        sale.payment_method === 'card' ? 'badge-pending' :
                        'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                      }>
                        {getPaymentMethodLabel(sale.payment_method)}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <span className="text-pf-primary font-mono font-medium">
                        {formatCurrency(sale.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
