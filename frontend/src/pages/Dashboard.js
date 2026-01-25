import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardStats, getTodaySchedule } from '../lib/api';
import { 
  Users, 
  Calendar, 
  DollarSign, 
  Package,
  Clock,
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, scheduleRes] = await Promise.all([
        getDashboardStats(),
        getTodaySchedule()
      ]);
      setStats(statsRes.data);
      setTodaySchedule(scheduleRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 skeleton rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Sesiones Hoy',
      value: stats?.today_sessions || 0,
      icon: Calendar,
      color: 'text-pf-primary',
      bgColor: 'bg-pf-primary/10',
    },
    {
      label: 'Clientes Activos',
      value: stats?.active_clients || 0,
      icon: Users,
      color: 'text-pf-secondary',
      bgColor: 'bg-pf-secondary/10',
    },
    {
      label: 'Paquetes Activos',
      value: stats?.active_packages || 0,
      icon: Package,
      color: 'text-pf-warning',
      bgColor: 'bg-pf-warning/10',
    },
    {
      label: 'Ventas del Mes',
      value: formatCurrency(stats?.month_revenue || 0),
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
  ];

  return (
    <div className="space-y-8" data-testid="dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-unbounded text-2xl md:text-3xl text-white">Dashboard</h1>
          <p className="text-pf-text-secondary mt-1">
            Resumen de actividad de Pump Fit
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/clients">
            <Button className="btn-outline" data-testid="new-client-btn">
              <Users size={18} className="mr-2" />
              Nuevo Cliente
            </Button>
          </Link>
          <Link to="/calendar">
            <Button className="btn-primary" data-testid="new-session-btn">
              <Calendar size={18} className="mr-2" />
              Agendar Sesión
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="glass-card p-6 stats-card"
              data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-pf-text-secondary text-sm">{stat.label}</p>
                  <p className={`metric-value mt-2 ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-sm ${stat.bgColor}`}>
                  <Icon className={stat.color} size={24} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Today's Revenue Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="glass-card p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-unbounded text-lg text-white">Ventas Hoy</h3>
            <DollarSign className="text-pf-primary" size={20} />
          </div>
          <div className="text-4xl font-unbounded text-pf-primary mb-2">
            {formatCurrency(stats?.today_revenue || 0)}
          </div>
          <p className="text-pf-text-secondary text-sm">
            {new Date().toLocaleDateString('es-MX', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </Card>

        {/* Today's Schedule */}
        <Card className="glass-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-unbounded text-lg text-white">Agenda de Hoy</h3>
            <Link to="/calendar">
              <Button variant="ghost" className="text-pf-secondary text-sm">
                Ver todo
                <ChevronRight size={16} className="ml-1" />
              </Button>
            </Link>
          </div>

          {todaySchedule.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto text-pf-text-secondary mb-3" size={40} />
              <p className="text-pf-text-secondary">No hay sesiones programadas para hoy</p>
              <Link to="/calendar">
                <Button className="btn-primary mt-4">Agendar Sesión</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {todaySchedule.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-pf-surface rounded-sm border border-pf-border hover:border-pf-primary/30 transition-colors"
                  data-testid={`session-${session.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-sm bg-pf-primary/10 flex items-center justify-center">
                      <Clock className="text-pf-primary" size={20} />
                    </div>
                    <div>
                      <p className="text-white font-medium">{session.client_name}</p>
                      <p className="text-pf-text-secondary text-sm font-mono">
                        {session.time} • Traje {session.suit_number}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    className={session.status === 'rescheduled' ? 'badge-pending' : 'badge-active'}
                  >
                    {session.status === 'rescheduled' ? 'Reagendada' : 'Programada'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card p-4 text-center">
          <p className="text-pf-text-secondary text-xs uppercase tracking-wider mb-1">Horario</p>
          <p className="text-white font-mono">9:00 - 19:00</p>
        </Card>
        <Card className="glass-card p-4 text-center">
          <p className="text-pf-text-secondary text-xs uppercase tracking-wider mb-1">Duración</p>
          <p className="text-white font-mono">18 min</p>
        </Card>
        <Card className="glass-card p-4 text-center">
          <p className="text-pf-text-secondary text-xs uppercase tracking-wider mb-1">Trajes</p>
          <p className="text-white font-mono">6 EMS</p>
        </Card>
        <Card className="glass-card p-4 text-center">
          <p className="text-pf-text-secondary text-xs uppercase tracking-wider mb-1">Capacidad</p>
          <p className="text-white font-mono">~33/día</p>
        </Card>
      </div>
    </div>
  );
}
