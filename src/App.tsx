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
import AdminDashboard from './pages/AdminDashboard';
import Maintenance from './pages/Maintenance';
import NotFound from './pages/NotFound';
import NotificationsPage from './pages/NotificationsPage';
import { useAuth } from './context/AuthContext';

function App() {
  const { userId, isAdmin, isMaintenance } = useAuth();
  const location = useLocation();

  const currentPath = location.pathname.toLowerCase();
  const isAuthPage = currentPath === '/login';
  const isMaintenancePage = currentPath === '/maintenance';
  const isPublicPage = isAuthPage || isMaintenancePage;

  // BAKIM MODU KONTROLÜ
  // Eğer bakım modu aktifse VE kullanıcı Admin değilse:
  // - Sadece /login ve /maintenance sayfalarına izin ver.
  // - Diğer tüm sayfaları (Register dahil) /maintenance sayfasına yönlendir.
  if (isMaintenance && !isAdmin && !isPublicPage) {
    return <Navigate to="/maintenance" replace />;
  }

  // ANONİM KULLANICI KONTROLÜ (Bakım Modu Refinement Talebi)
  // "anonimken sadece login sayfası açılabilsin"
  // Eğer bakım modu aktifse VE kullanıcı giriş yapmamışsa (false) VE login sayfasında değilse:
  // (Not: Yukarıdaki isMaintenance check'i zaten bunu kapsıyor ama register'ı özel olarak engellemek için önemli)
  if (isMaintenance && userId === false && currentPath === '/register') {
    return <Navigate to="/maintenance" replace />;
  }

  return (
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
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/maintenance" element={<Maintenance />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;