import { Routes, Route } from 'react-router-dom';
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
import NotFound from './pages/NotFound';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} /> {/* Güncellendi */}
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
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;