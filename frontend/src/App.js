import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import ClientLogin from "./pages/ClientLogin";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import Calendar from "./pages/Calendar";
import Sales from "./pages/Sales";
import ClientPortal from "./pages/ClientPortal";
import Reception from "./pages/Reception";
import UserManagement from "./pages/UserManagement";
import Layout from "./components/Layout";
import "./App.css";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-pf-background flex items-center justify-center">
        <div className="animate-pulse-neon w-16 h-16 rounded-full bg-pf-primary/20"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Client goes to portal
  if (user.role === "client") {
    return <Navigate to="/portal" replace />;
  }

  // Reception goes to their own page if trying to access admin-only
  if (user.role === "reception" && allowedRoles.length > 0 && !allowedRoles.includes("reception")) {
    return <Navigate to="/reception" replace />;
  }

  // Check allowed roles
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const StaffRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-pf-background flex items-center justify-center"><div className="animate-pulse-neon w-16 h-16 rounded-full bg-pf-primary/20"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "client") return <Navigate to="/portal" replace />;
  if (user.role === "reception") return <Navigate to="/reception" replace />;
  return <Layout><Dashboard /></Layout>;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/cliente" element={<ClientLogin />} />
          
          {/* Home - redirects based on role */}
          <Route path="/" element={<StaffRedirect />} />

          {/* Admin/Superadmin Routes */}
          <Route path="/clients" element={
            <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
              <Layout><Clients /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/clients/:id" element={
            <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
              <Layout><ClientProfile /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
              <Layout><Calendar /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/sales" element={
            <ProtectedRoute allowedRoles={["superadmin", "admin"]}>
              <Layout><Sales /></Layout>
            </ProtectedRoute>
          } />
          
          {/* Superadmin Only */}
          <Route path="/user-management" element={
            <ProtectedRoute allowedRoles={["superadmin"]}>
              <Layout><UserManagement /></Layout>
            </ProtectedRoute>
          } />

          {/* Reception */}
          <Route path="/reception" element={
            <ProtectedRoute allowedRoles={["superadmin", "admin", "reception"]}>
              <Reception />
            </ProtectedRoute>
          } />
          
          {/* Client Portal */}
          <Route path="/portal" element={
            <ProtectedRoute>
              <ClientPortal />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" theme="dark" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
