import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientProfile from "./pages/ClientProfile";
import Calendar from "./pages/Calendar";
import Sales from "./pages/Sales";
import ClientPortal from "./pages/ClientPortal";
import Layout from "./components/Layout";
import "./App.css";

const ProtectedRoute = ({ children, adminOnly = false }) => {
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
  
  if (adminOnly && user.role === "client") {
    return <Navigate to="/portal" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Admin/Staff Routes */}
          <Route path="/" element={
            <ProtectedRoute adminOnly>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/clients" element={
            <ProtectedRoute adminOnly>
              <Layout><Clients /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/clients/:id" element={
            <ProtectedRoute adminOnly>
              <Layout><ClientProfile /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute adminOnly>
              <Layout><Calendar /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/sales" element={
            <ProtectedRoute adminOnly>
              <Layout><Sales /></Layout>
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
