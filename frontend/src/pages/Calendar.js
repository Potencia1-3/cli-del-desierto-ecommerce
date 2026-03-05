import { useState, useEffect } from 'react';
import { getCalendarSessions, getTimeSlots, createSession, getClients, getPackages, completeSession, cancelSession } from '../lib/api';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Clock,
  User,
  Check,
  X
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Calendar as CalendarPicker } from '../components/ui/calendar';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import { toast } from 'sonner';

const SUITS = [1, 2];  // Only 2 suits available
const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function Calendar() {
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [sessions, setSessions] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [packages, setPackages] = useState([]);
  
  const [sessionForm, setSessionForm] = useState({
    client_id: '',
    package_id: '',
    date: '',
    time: '',
    suit_number: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTimeSlots();
    fetchClients();
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [currentWeek]);

  useEffect(() => {
    if (sessionForm.client_id) {
      fetchClientPackages(sessionForm.client_id);
    }
  }, [sessionForm.client_id]);

  const fetchTimeSlots = async () => {
    try {
      const response = await getTimeSlots();
      setTimeSlots(response.data);
    } catch (error) {
      console.error('Error fetching time slots:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await getClients();
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchClientPackages = async (clientId) => {
    try {
      const response = await getPackages(clientId, 'active');
      setPackages(response.data);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const startDate = format(currentWeek, 'yyyy-MM-dd');
      const endDate = format(addDays(currentWeek, 6), 'yyyy-MM-dd');
      const response = await getCalendarSessions(startDate, endDate);
      setSessions(response.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekDates = () => {
    return Array.from({ length: 6 }, (_, i) => addDays(currentWeek, i));
  };

  const getSessionsForSlot = (date, time, suit) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return sessions.filter(
      s => s.date === dateStr && s.time === time && s.suit_number === suit
    );
  };

  const handlePrevWeek = () => {
    setCurrentWeek(addDays(currentWeek, -7));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addDays(currentWeek, 7));
  };

  const handleSlotClick = (date, time, suit) => {
    setSessionForm({
      client_id: '',
      package_id: '',
      date: format(date, 'yyyy-MM-dd'),
      time: time,
      suit_number: String(suit)
    });
    setDialogOpen(true);
  };

  const handleCreateSession = async () => {
    setSaving(true);
    try {
      await createSession({
        client_id: sessionForm.client_id,
        package_id: sessionForm.package_id,
        date: sessionForm.date,
        time: sessionForm.time,
        suit_number: parseInt(sessionForm.suit_number)
      });
      toast.success('Sesión agendada');
      setDialogOpen(false);
      setSessionForm({ client_id: '', package_id: '', date: '', time: '', suit_number: '' });
      fetchSessions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al agendar');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await completeSession(sessionId);
      toast.success('Sesión completada');
      fetchSessions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
    }
  };

  const handleCancelSession = async (sessionId, e) => {
    e.stopPropagation();
    try {
      await cancelSession(sessionId);
      toast.success('Sesión cancelada');
      fetchSessions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error');
    }
  };

  const weekDates = getWeekDates();

  return (
    <div className="space-y-6" data-testid="calendar-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-unbounded text-2xl md:text-3xl text-white">Calendario</h1>
          <p className="text-pf-text-secondary mt-1">
            Gestiona las sesiones de electroestimulación
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="btn-outline" data-testid="date-picker-btn">
                {format(currentWeek, "d 'de' MMMM, yyyy", { locale: es })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-pf-surface border-pf-border" align="end">
              <CalendarPicker
                mode="single"
                selected={currentWeek}
                onSelect={(date) => date && setCurrentWeek(startOfWeek(date, { weekStartsOn: 1 }))}
                className="rounded-sm"
              />
            </PopoverContent>
          </Popover>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handlePrevWeek}
              className="btn-ghost"
              data-testid="prev-week-btn"
            >
              <ChevronLeft size={20} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleNextWeek}
              className="btn-ghost"
              data-testid="next-week-btn"
            >
              <ChevronRight size={20} />
            </Button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-pf-primary/30 border border-pf-primary rounded-sm" />
          <span className="text-pf-text-secondary">Programada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-pf-warning/30 border border-pf-warning rounded-sm" />
          <span className="text-pf-text-secondary">Reagendada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-pf-secondary/30 border border-pf-secondary rounded-sm" />
          <span className="text-pf-text-secondary">Completada</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Header Row */}
            <div className="grid grid-cols-7 border-b border-pf-border">
              <div className="p-3 bg-pf-surface-highlight">
                <span className="text-pf-text-secondary text-sm">Hora / Traje</span>
              </div>
              {weekDates.map((date, i) => {
                const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                return (
                  <div 
                    key={i} 
                    className={`p-3 text-center border-l border-pf-border ${isToday ? 'bg-pf-primary/10' : 'bg-pf-surface-highlight'}`}
                  >
                    <p className={`text-sm ${isToday ? 'text-pf-primary' : 'text-pf-text-secondary'}`}>
                      {DAYS[i]}
                    </p>
                    <p className={`text-lg font-mono ${isToday ? 'text-pf-primary' : 'text-white'}`}>
                      {format(date, 'd')}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Time Slots */}
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-pulse-neon w-12 h-12 mx-auto rounded-full bg-pf-primary/20" />
              </div>
            ) : (
              timeSlots.slice(0, 20).map((time) => (
                <div key={time} className="grid grid-cols-7 border-b border-pf-border/50">
                  <div className="p-2 bg-pf-surface flex items-center justify-center">
                    <span className="text-pf-text-secondary text-xs font-mono">{time}</span>
                  </div>
                  {weekDates.map((date, dayIndex) => (
                    <div 
                      key={dayIndex} 
                      className="border-l border-pf-border/50 p-1 min-h-[80px] bg-pf-background"
                    >
                      <div className="grid grid-cols-2 gap-1 h-full">
                        {SUITS.map((suit) => {
                          const slotSessions = getSessionsForSlot(date, time, suit);
                          const session = slotSessions[0];
                          const isBooked = !!session;
                          
                          return (
                            <div
                              key={suit}
                              onClick={() => !isBooked && handleSlotClick(date, time, suit)}
                              className={`
                                p-1 rounded-sm text-xs cursor-pointer transition-all
                                ${isBooked 
                                  ? session.status === 'completed'
                                    ? 'bg-pf-secondary/20 border border-pf-secondary/30'
                                    : session.is_reschedule
                                      ? 'bg-pf-warning/20 border border-pf-warning/30'
                                      : 'bg-pf-primary/20 border border-pf-primary/30'
                                  : 'bg-pf-surface hover:bg-pf-primary/10 border border-transparent hover:border-pf-primary/30'
                                }
                              `}
                              data-testid={`slot-${format(date, 'yyyy-MM-dd')}-${time}-${suit}`}
                            >
                              {isBooked ? (
                                <div className="relative group">
                                  <p className="text-white text-[10px] truncate">{session.client_name}</p>
                                  <p className="text-pf-text-secondary text-[9px]">T{suit}</p>
                                  {session.status !== 'completed' && (
                                    <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5">
                                      <button
                                        onClick={(e) => handleCompleteSession(session.id, e)}
                                        className="p-0.5 bg-pf-secondary rounded-sm"
                                      >
                                        <Check size={10} />
                                      </button>
                                      <button
                                        onClick={(e) => handleCancelSession(session.id, e)}
                                        className="p-0.5 bg-pf-error rounded-sm"
                                      >
                                        <X size={10} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100">
                                  <Plus size={12} className="text-pf-primary" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </Card>

      {/* Suits Legend */}
      <div className="flex flex-wrap gap-2 justify-center">
        {SUITS.map((suit) => (
          <Badge key={suit} className="badge-active">
            Traje {suit}
          </Badge>
        ))}
      </div>

      {/* Create Session Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-card border-pf-border">
          <DialogHeader>
            <DialogTitle className="font-unbounded text-white">Nueva Sesión</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex gap-4 text-sm text-pf-text-secondary">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-pf-primary" />
                <span>{sessionForm.date} - {sessionForm.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <User size={16} className="text-pf-secondary" />
                <span>Traje {sessionForm.suit_number}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-pf-text-secondary">Cliente</Label>
              <Select
                value={sessionForm.client_id}
                onValueChange={(value) => setSessionForm({...sessionForm, client_id: value, package_id: ''})}
              >
                <SelectTrigger className="input-dark" data-testid="session-client-select">
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

            {sessionForm.client_id && (
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
                    {packages.length === 0 ? (
                      <div className="p-3 text-pf-text-secondary text-sm text-center">
                        Sin paquetes activos
                      </div>
                    ) : (
                      packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id} className="text-white hover:bg-pf-primary/20">
                          {pkg.total_sessions} sesiones - {pkg.remaining_sessions} restantes
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-4">
              <Button variant="ghost" onClick={() => setDialogOpen(false)} className="btn-ghost">
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateSession} 
                className="btn-primary" 
                disabled={saving || !sessionForm.client_id || !sessionForm.package_id}
                data-testid="save-calendar-session-btn"
              >
                {saving ? 'Guardando...' : 'Agendar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
