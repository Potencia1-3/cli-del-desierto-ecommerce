import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { registerClient } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Zap, Lock, Mail, User, Phone, Calendar, ArrowLeft } from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_45d77d8f-2afe-4a7b-9bc9-afe465e1f07c/artifacts/1z71m00b_IMG-20260123-WA0036.jpg";
const BG_IMAGE = "https://images.pexels.com/photos/6551138/pexels-photo-6551138.jpeg";

export default function ClientLogin() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      if (user.role === 'client') {
        navigate('/portal');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userData = await login(email, password);
      toast.success(`¡Bienvenido, ${userData.name}!`);
      
      if (userData.role === 'client') {
        navigate('/portal');
      } else {
        navigate('/');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await registerClient({
        email,
        password,
        name,
        phone,
        birth_date: birthDate || null
      });
      
      // Auto-login after registration
      localStorage.setItem('pf_token', response.data.token);
      toast.success('¡Cuenta creada exitosamente!');
      window.location.href = '/portal';
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pf-background flex">
      {/* Left side - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center"
        style={{ backgroundImage: `url(${BG_IMAGE})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-pf-background via-pf-background/80 to-transparent" />
        <div className="relative z-10 flex flex-col justify-center p-12">
          <img src={LOGO_URL} alt="Pump Fit" className="h-20 w-auto mb-8" />
          <h1 className="font-unbounded text-4xl text-white mb-4">
            Portal de Cliente
          </h1>
          <p className="text-pf-text-secondary text-lg max-w-md">
            Agenda tus sesiones de electroestimulación, lleva el control de tu progreso y alcanza tus metas.
          </p>
          
          <div className="mt-12 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-pf-primary/20 flex items-center justify-center">
                <Calendar className="text-pf-primary" size={24} />
              </div>
              <div>
                <p className="text-white font-medium">Agenda Fácil</p>
                <p className="text-pf-text-secondary text-sm">Reserva tus sesiones en segundos</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-pf-secondary/20 flex items-center justify-center">
                <Zap className="text-pf-secondary" size={24} />
              </div>
              <div>
                <p className="text-white font-medium">Seguimiento de Progreso</p>
                <p className="text-pf-text-secondary text-sm">Visualiza tus medidas y avances</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <img src={LOGO_URL} alt="Pump Fit" className="h-16 mx-auto mb-4" />
          </div>

          <div className="glass-card p-8 rounded-sm">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pf-secondary/20 flex items-center justify-center">
                <User className="text-pf-secondary" size={32} />
              </div>
              <h2 className="font-unbounded text-2xl text-white">
                {isRegister ? 'Crear Cuenta' : 'Acceso Clientes'}
              </h2>
              <p className="text-pf-text-secondary mt-2">
                {isRegister ? 'Regístrate para agendar tus sesiones' : 'Ingresa a tu portal personal'}
              </p>
            </div>

            {isRegister ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-pf-text-secondary">Nombre Completo</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-pf-text-secondary" size={18} />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      className="input-dark pl-12"
                      required
                      data-testid="register-name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-pf-text-secondary">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-pf-text-secondary" size={18} />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="input-dark pl-12"
                      required
                      data-testid="register-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-pf-text-secondary">Teléfono</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-pf-text-secondary" size={18} />
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="55 1234 5678"
                      className="input-dark pl-12"
                      required
                      data-testid="register-phone"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate" className="text-pf-text-secondary">Fecha de Nacimiento (opcional)</Label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-pf-text-secondary" size={18} />
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="input-dark pl-12"
                      data-testid="register-birthdate"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-pf-text-secondary">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-pf-text-secondary" size={18} />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-dark pl-12"
                      required
                      minLength={6}
                      data-testid="register-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full btn-primary h-12 font-semibold"
                  disabled={loading}
                  data-testid="register-submit"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Crear Cuenta'
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-pf-text-secondary">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-pf-text-secondary" size={18} />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="input-dark pl-12"
                      required
                      data-testid="client-login-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-pf-text-secondary">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-pf-text-secondary" size={18} />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-dark pl-12"
                      required
                      data-testid="client-login-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full btn-primary h-12 font-semibold"
                  disabled={loading}
                  data-testid="client-login-submit"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    'Ingresar'
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsRegister(!isRegister)}
                className="text-pf-secondary hover:text-pf-secondary/80 text-sm"
                data-testid="toggle-register"
              >
                {isRegister 
                  ? '¿Ya tienes cuenta? Inicia sesión' 
                  : '¿No tienes cuenta? Regístrate aquí'}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-pf-border">
              <Link to="/login" className="flex items-center justify-center gap-2 text-pf-text-secondary hover:text-white text-sm">
                <ArrowLeft size={16} />
                Acceso Administrador
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
