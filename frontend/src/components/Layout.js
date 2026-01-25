import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  DollarSign, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Button } from './ui/button';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_45d77d8f-2afe-4a7b-9bc9-afe465e1f07c/artifacts/1z71m00b_IMG-20260123-WA0036.jpg";

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/clients', icon: Users, label: 'Clientes' },
  { path: '/calendar', icon: Calendar, label: 'Calendario' },
  { path: '/sales', icon: DollarSign, label: 'Ventas' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-pf-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-pf-surface border-r border-pf-border flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-pf-border">
          <img 
            src={LOGO_URL} 
            alt="Pump Fit" 
            className="h-12 object-contain"
            data-testid="logo"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={`sidebar-item mb-1 ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-pf-border">
          <div className="text-sm text-pf-text-secondary mb-2">{user?.name}</div>
          <div className="text-xs text-pf-text-secondary/60 mb-3">{user?.email}</div>
          <Button
            variant="ghost"
            className="w-full justify-start text-pf-error hover:bg-pf-error/10"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut size={18} className="mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-pf-surface border-b border-pf-border z-30">
        <div className="flex items-center justify-between p-4">
          <img src={LOGO_URL} alt="Pump Fit" className="h-8" />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/70 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <div className={`md:hidden fixed top-0 left-0 w-72 h-full bg-pf-surface z-50 transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-pf-border">
          <img src={LOGO_URL} alt="Pump Fit" className="h-10" />
        </div>
        <nav className="p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item mb-1 ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-pf-border absolute bottom-0 left-0 right-0">
          <div className="text-sm text-pf-text-secondary mb-2">{user?.name}</div>
          <Button
            variant="ghost"
            className="w-full justify-start text-pf-error"
            onClick={handleLogout}
          >
            <LogOut size={18} className="mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:p-8 p-4 pt-20 md:pt-8 overflow-auto">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
