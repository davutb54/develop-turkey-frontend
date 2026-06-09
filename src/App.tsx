import { useEffect, useState } from 'react';
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
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/tabs/AdminOverview';
import CommandCenter from './pages/admin/tabs/CommandCenter';
import UsersTab from './pages/admin/tabs/UsersTab';
import TopicsTab from './pages/admin/tabs/TopicsTab';
import InstitutionsTab from './pages/admin/tabs/InstitutionsTab';
import ProblemsTab from './pages/admin/tabs/ProblemsTab';
import SolutionsTab from './pages/admin/tabs/SolutionsTab';
import ExpertApprovalsTab from './pages/admin/tabs/ExpertApprovalsTab';
import ReportsTab from './pages/admin/tabs/ReportsTab';
import FeedbacksTab from './pages/admin/tabs/FeedbacksTab';
import SystemLogsTab from './pages/admin/tabs/SystemLogsTab';
import ActivityLogsTab from './pages/admin/tabs/ActivityLogsTab';
import SettingsTab from './pages/admin/tabs/SettingsTab';
import AgreementsTab from './pages/admin/tabs/AgreementsTab';
import CorporateTab from './pages/admin/tabs/CorporateTab';
import EmailTemplatesTab from './pages/admin/tabs/EmailTemplatesTab';
import FeatureManager from './pages/admin/FeatureManager';
import WorkflowBuilder from './pages/admin/WorkflowBuilder';
import CapabilityManagementTab from './pages/admin/tabs/CapabilityManagementTab';
import CapabilityTemplatesTab from './pages/admin/tabs/CapabilityTemplatesTab';
import CapabilityAuditTab from './pages/admin/tabs/CapabilityAuditTab';
import AnnouncementsTab from './pages/admin/tabs/AnnouncementsTab';
import DashboardLayout from './pages/admin/dashboard/DashboardLayout';
import Overview from './pages/admin/dashboard/Overview';
import CapabilityMetrics from './pages/admin/dashboard/CapabilityMetrics';
import WorkflowMetricsPage from './pages/admin/dashboard/WorkflowMetrics';
import UserMetricsPage from './pages/admin/dashboard/UserMetrics';
import SystemHealthPage from './pages/admin/dashboard/SystemHealth';
import AuditLogBrowser from './pages/admin/dashboard/AuditLogBrowser';
import WorkflowDeadLetterTab from './pages/admin/tabs/WorkflowDeadLetterTab';
import KillSwitchTab from './pages/admin/tabs/KillSwitchTab';
import SecurityTab from './pages/admin/tabs/SecurityTab';
import ChatManagementTab from './pages/admin/tabs/ChatManagementTab';
import Maintenance from './pages/Maintenance';
import NotFound from './pages/NotFound';
import NotificationsPage from './pages/NotificationsPage';
import LegalAgreementDetail from './pages/LegalAgreementDetail';
import About from './pages/About';
import Footer from './components/Footer';
import AgreementModal from './components/AgreementModal';
import FloatingChatWidget from './components/chat/FloatingChatWidget';
import { useAuth } from './context/AuthContext';
import { legalAgreementService } from './services/legalAgreementService';
import { useFeature } from './hooks/useFeature';
import type { LegalAgreement } from './types';

function App() {
  const { userId, hasCapability, isMaintenance, isProfileIncomplete, hasPendingAgreement, checkAuth } = useAuth();
  const location = useLocation();
  const [pendingAgreements, setPendingAgreements] = useState<LegalAgreement[]>([]);

  // Dark Mode Feature
  const darkModeEnabled = useFeature<boolean>('UX.DarkModeEnabled', false);
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    return stored !== null ? stored === 'true' : false;
  });

  // Dark mode sınıfını html elementine uygula
  useEffect(() => {
    if (darkModeEnabled && isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkModeEnabled, isDark]);

  const toggleDarkMode = () => {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem('darkMode', String(next));
      return next;
    });
  };

  // Sayfa her değiştiğinde en tepeye kaydır (Scroll to top)
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // hasPendingAgreement=true olduğunda aktif sözleşmeleri çek
  useEffect(() => {
    if (hasPendingAgreement && userId) {
      legalAgreementService.getActive()
        .then((res) => {
          if (res.data.success) setPendingAgreements(res.data.data);
        })
        .catch(() => { /* Hata durumunda modal boş kalır */ });
    }
  }, [hasPendingAgreement, userId]);

  const currentPath = location.pathname.toLowerCase();
  const isAuthPage = currentPath === '/login' || currentPath === '/register';
  const isMaintenancePage = currentPath === '/maintenance';
  const isAdminPage = currentPath.startsWith('/admin');
  const isPublicPage = isAuthPage || isMaintenancePage;
  const showFooter = !isAuthPage && !isMaintenancePage && !isAdminPage;

  // BAKIM MODU KONTROLÜ
  if (isMaintenance && !hasCapability('admin.system_access') && !isPublicPage) {
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
      {/* Dark Mode Toggle Butonu */}
      {darkModeEnabled && (
        <button
          onClick={toggleDarkMode}
          className="fixed bottom-20 right-6 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-3 shadow-lg hover:shadow-xl transition-all"
          title={isDark ? 'Aydınlık Moda Geç' : 'Karanlık Moda Geç'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
      )}
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
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<AdminOverview />} />
          <Route path="command-center" element={<CommandCenter />} />
          <Route path="users" element={<UsersTab />} />
          <Route path="topics" element={<TopicsTab />} />
          <Route path="institutions" element={<InstitutionsTab />} />
          <Route path="problems" element={<ProblemsTab />} />
          <Route path="solutions" element={<SolutionsTab />} />
          <Route path="expert-approvals" element={<ExpertApprovalsTab />} />
          <Route path="reports" element={<ReportsTab />} />
          <Route path="feedbacks" element={<FeedbacksTab />} />
          <Route path="logs" element={<SystemLogsTab />} />
          <Route path="activity-logs" element={<ActivityLogsTab />} />
          <Route path="settings" element={<SettingsTab />} />
          <Route path="agreements" element={<AgreementsTab />} />
          <Route path="corporate" element={<CorporateTab />} />
          <Route path="email-templates" element={<EmailTemplatesTab />} />
          <Route path="workflow" element={<WorkflowBuilder />} />
          <Route path="features" element={<FeatureManager />} />
          <Route path="capabilities" element={<CapabilityManagementTab />} />
          <Route path="capability-templates" element={<CapabilityTemplatesTab />} />
          <Route path="capability-audit" element={<CapabilityAuditTab />} />
          <Route path="announcements" element={<AnnouncementsTab />} />
          <Route path="kill-switch" element={<KillSwitchTab />} />
          <Route path="security" element={<SecurityTab />} />
          <Route path="chat" element={<ChatManagementTab />} />
          <Route path="metrics" element={<DashboardLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<Overview />} />
            <Route path="capabilities" element={<CapabilityMetrics />} />
            <Route path="workflow" element={<WorkflowMetricsPage />} />
            <Route path="users" element={<UserMetricsPage />} />
            <Route path="system" element={<SystemHealthPage />} />
            <Route path="audit-log" element={<AuditLogBrowser />} />
            <Route path="dead-letters" element={<WorkflowDeadLetterTab />} />
          </Route>
        </Route>
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/about" element={<About />} />
        <Route path="/legal/:type" element={<LegalAgreementDetail />} />
        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showFooter && <Footer />}

      {/* ── GLOBAL YÜZEN SOHBET WİDGETI (admin olmayan kullanıcılar için) ── */}
      <FloatingChatWidget />

      {/* ── GLOBAL ZORUNLU SÖZLEŞME ONAY MODALI ── */}
      {hasPendingAgreement && userId && pendingAgreements.length > 0 && (
        <AgreementModal
          agreements={pendingAgreements}
          onAcceptAll={async () => {
            await checkAuth(); // hasPendingAgreement state'ini güncelle
            setPendingAgreements([]);
          }}
        />
      )}
    </div>
  );
}

export default App;

