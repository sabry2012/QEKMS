import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ClientStatus from './pages/ClientStatus';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import QuantumDashboard from './pages/QuantumDashboard';
import AuditLogsDashboard from './pages/AuditLogsDashboard';
import ForgotPassword from './pages/ForgotPassword';
import UpgradePage from './pages/UpgradePage';
import CompleteProfile from './pages/CompleteProfile';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 bg-[#05070a]">Loading Intelligence...</div>;
  if (!user) return <Navigate to="/login" />;
  
  // Profile Completion Guard
  if (!user.phone_number && user.role !== 'admin' && window.location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" />;
  }
  
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 bg-[#05070a]">Loading clearance...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" />;
  return <>{children}</>;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/status" element={<ClientStatus />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/complete-profile" element={
          <ProtectedRoute>
            <CompleteProfile />
          </ProtectedRoute>
        } />

        {/* Authenticated (Wrapped in AppLayout via Route components) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/upgrade"
          element={
            <ProtectedRoute>
              <UpgradePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/quantum"
          element={
            <ProtectedRoute>
              <QuantumDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin only */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        <Route
          path="/audit"
          element={
            <AdminRoute>
              <AuditLogsDashboard />
            </AdminRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
