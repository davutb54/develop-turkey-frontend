import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home'; // Yeni
import ProblemDetail from './pages/ProblemDetail';
import CreateProblem from './pages/CreateProblem';
import Profile from './pages/Profile';
import UserProfile from './pages/UserProfile';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CompleteProfile from './pages/CompleteProfile';
import AdminDashboard from './pages/AdminDashboard';
import Maintenance from './pages/Maintenance';
import NotFound from './pages/NotFound';
import NotificationsPage from './pages/NotificationsPage';
import Footer from './components/Footer';
import { useAuth } from './context/AuthContext';

function App() {
  const { userId, isAdmin, isMaintenance, isProfileIncomplete } = useAuth();
  const location = useLocation();

  // Sayfa her değiştiğinde en tepeye kaydır (Scroll to top)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const currentPath = location.pathname.toLowerCase();
  const isAuthPage = currentPath === '/login' || currentPath === '/register';
  const isMaintenancePage = currentPath === '/maintenance';
  const isAdminPage = currentPath.startsWith('/admin');
  const isPublicPage = isAuthPage || isMaintenancePage;
  const showFooter = !isAuthPage && !isMaintenancePage && !isAdminPage;

  // BAKIM MODU KONTROLÜ
  if (isMaintenance && !isAdmin && !isPublicPage) {
    return <Navigate to="/maintenance" replace />;
  }

  // ANONİM KULLANICI KONTROLÜ
  if (isMaintenance && userId === false && currentPath === '/register') {
    return <Navigate to="/maintenance" replace />;
  }

  // PROFİL TAMAMLAMA KONTROLÜ
  if (userId !== null && userId !== false && isProfileIncomplete && currentPath !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }
  if (userId !== null && userId !== false && !isProfileIncomplete && currentPath === '/complete-profile') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/problem/:id" element={<ProblemDetail />} />
        <Route path="/add-problem" element={<CreateProblem />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/user/:id" element={<UserProfile />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/complete-profile" element={userId ? <CompleteProfile /> : <Navigate to="/login" replace />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showFooter && <Footer />}
    </div>
  );
}

export default App;