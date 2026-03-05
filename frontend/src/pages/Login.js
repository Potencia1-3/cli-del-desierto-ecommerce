import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { initAdmin } from '../lib/api';
import { Zap, Lock, Mail } from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_45d77d8f-2afe-4a7b-9bc9-afe465e1f07c/artifacts/1z71m00b_IMG-20260123-WA0036.jpg";
const BG_IMAGE = "https://images.unsplash.com/photo-1581986358940-80f75484cf09?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwxfHxuZW9uJTIwZ3ltJTIwaW50ZXJpb3IlMjBkYXJrJTIwY3liZXJwdW5rfGVufDB8fHx8MTc2OTM0NTYyNnww&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  useEffect(() => {
    // Initialize admin on first load
    initAdmin().catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
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
            Sistema de Gestión
          </h1>
          <p className="text-pf-text-secondary text-lg max-w-md">
            Administra tus clientes, sesiones y ventas de manera eficiente con nuestro CRM especializado para electroestimulación.
          </p>
          
          <div className="mt-12 flex gap-8">
            <div className="text-center">
              <div className="text-pf-primary text-3xl font-unbounded">18</div>
              <div className="text-pf-text-secondary text-sm">min/sesión</div>
            </div>
            <div className="text-center">
              <div className="text-pf-secondary text-3xl font-unbounded">6</div>
              <div className="text-pf-text-secondary text-sm">trajes EMS</div>
            </div>
            <div className="text-center">
              <div className="text-pf-primary text-3xl font-unbounded">∞</div>
              <div className="text-pf-text-secondary text-sm">resultados</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <img src={LOGO_URL} alt="Pump Fit" className="h-16 mx-auto mb-4" />
          </div>

          <div className="glass-card p-8 rounded-sm">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-pf-primary/20 flex items-center justify-center">
                <Zap className="text-pf-primary" size={32} />
              </div>
              <h2 className="font-unbounded text-2xl text-white">Iniciar Sesión</h2>
              <p className="text-pf-text-secondary mt-2">Accede al sistema de gestión</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-pf-text-secondary">
                  Correo Electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-pf-text-secondary" size={18} />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="input-dark pl-12"
                    required
                    data-testid="login-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-pf-text-secondary">
                  Contraseña
                </Label>
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
                    data-testid="login-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full btn-primary h-12 font-semibold"
                disabled={loading}
                data-testid="login-submit"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Ingresar'
                )}
              </Button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
}
